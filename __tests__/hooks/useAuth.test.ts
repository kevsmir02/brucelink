import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../src/utils/constants';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

const mockRestoreSession = jest.fn();
const mockApiLogout = jest.fn();
const mockSetBaseUrl = jest.fn();
const mockRegisterUnauthorizedHandler = jest.fn();

jest.mock('../../src/services/api', () => ({
  restoreSession: (...args: unknown[]) => mockRestoreSession(...args),
  logout: (...args: unknown[]) => mockApiLogout(...args),
  setBaseUrl: (...args: unknown[]) => mockSetBaseUrl(...args),
  registerUnauthorizedHandler: (...args: unknown[]) => mockRegisterUnauthorizedHandler(...args),
}));

function flush(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores unauthenticated state when no token exists', async () => {
    mockRestoreSession.mockResolvedValue({ token: null, baseUrl: null });

    let captured: any = null;
    function Probe() {
      captured = useAuth();
      return null;
    }

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        React.createElement(AuthProvider, null, React.createElement(Probe)),
      );
      await flush();
    });

    expect(captured.authState).toBe('unauthenticated');
    expect(mockRegisterUnauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('marks authenticated and logs out through context actions', async () => {
    mockRestoreSession.mockResolvedValue({ token: null, baseUrl: null });
    mockApiLogout.mockResolvedValue(undefined);

    let captured: any = null;
    function Probe() {
      captured = useAuth();
      return null;
    }

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        React.createElement(AuthProvider, null, React.createElement(Probe)),
      );
      await flush();
    });

    await ReactTestRenderer.act(async () => {
      captured?.markAuthenticated('http://172.0.0.1');
    });
    expect(captured.authState).toBe('authenticated');
    expect(captured.baseUrl).toBe('http://172.0.0.1');

    await ReactTestRenderer.act(async () => {
      await captured?.logout();
    });

    expect(mockApiLogout).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.session);
    expect(captured.authState).toBe('unauthenticated');
  });
});

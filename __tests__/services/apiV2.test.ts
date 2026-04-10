/**
 * Tests for the rebuilt auth flow in api.ts.
 * Verifies: secure storage for tokens, simplified 2-step login,
 * session restore from Keychain, and sanitized command dispatch.
 */

jest.mock('@react-native-cookies/cookies', () => ({
  get: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  DownloadDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  downloadFile: jest.fn(() => ({ promise: Promise.resolve({ statusCode: 200 }) })),
  readFile: jest.fn(() => Promise.resolve('')),
}));

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../../src/services/secureStorage';

import {
  apiClient,
  login,
  logout,
  restoreSession,
  sendCommand,
  setBaseUrl,
} from '../../src/services/api';

describe('auth flow (v2 — secure storage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setBaseUrl('http://172.0.0.1');
  });

  describe('login', () => {
    it('stores session token in secure storage on successful login', async () => {
      // Mock axios POST /login — return Set-Cookie header with session token
      jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        headers: {
          'set-cookie': 'BRUCESESSION=tok123; Path=/',
        },
        status: 302,
        data: '',
      } as any);

      const result = await login('http://172.0.0.1', 'bruce', 'brucenet');

      expect(result).toBe(true);
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'brucelink_session',
        'tok123',
        expect.objectContaining({ service: 'brucelink_session' }),
      );
    });

    it('stores baseUrl in AsyncStorage (non-sensitive)', async () => {
      jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        headers: {
          'set-cookie': 'BRUCESESSION=tok123; Path=/',
        },
        status: 302,
        data: '',
      } as any);

      await login('http://172.0.0.1', 'bruce', 'brucenet');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@bruce_base_url', 'http://172.0.0.1');
    });

    it('does NOT store token in AsyncStorage', async () => {
      jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        headers: {
          'set-cookie': 'BRUCESESSION=tok123; Path=/',
        },
        status: 302,
        data: '',
      } as any);

      await login('http://172.0.0.1', 'bruce', 'brucenet');

      // @bruce_session should NOT be set in AsyncStorage
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const sessionCalls = calls.filter(([key]: [string]) => key === '@bruce_session');
      expect(sessionCalls).toHaveLength(0);
    });

    it('returns false when credentials are wrong (redirect to failed)', async () => {
      jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        headers: {
          location: '/login?failed',
        },
        status: 302,
        data: '',
      } as any);

      const result = await login('http://172.0.0.1', 'wrong', 'creds');
      expect(result).toBe(false);
    });

    it('throws on network error', async () => {
      jest.spyOn(apiClient, 'post').mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout',
      });

      await expect(login('http://172.0.0.1', 'bruce', 'brucenet')).rejects.toThrow(
        'Device unreachable',
      );
    });
  });

  describe('restoreSession', () => {
    it('restores token from secure storage', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'brucelink_session',
        password: 'restored_token',
        service: 'brucelink_session',
        storage: 'keystore',
      });
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@bruce_base_url') return Promise.resolve('http://10.0.0.1');
        return Promise.resolve(null);
      });

      const result = await restoreSession();
      expect(result.token).toBe('restored_token');
      expect(result.baseUrl).toBe('http://10.0.0.1');
    });

    it('returns null token when nothing stored', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(false);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await restoreSession();
      expect(result.token).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears token from secure storage', async () => {
      jest.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: '' } as any);

      await logout();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'brucelink_session' }),
      );
    });

    it('does NOT leave token in AsyncStorage', async () => {
      jest.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: '' } as any);

      await logout();

      // Should not try to remove @bruce_session from AsyncStorage
      // (it was never stored there in v2)
      const removeCalls = (AsyncStorage.removeItem as jest.Mock).mock.calls;
      const sessionRemoves = removeCalls.filter(([key]: [string]) => key === '@bruce_session');
      expect(sessionRemoves).toHaveLength(0);
    });
  });

  describe('sendCommand with sanitization', () => {
    it('rejects commands with newline injection', async () => {
      await expect(sendCommand('rf rx\nmalicious')).rejects.toThrow('newline');
    });

    it('rejects commands with null bytes', async () => {
      await expect(sendCommand('rf rx\x00evil')).rejects.toThrow('null');
    });
  });
});

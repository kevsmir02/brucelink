import * as Keychain from 'react-native-keychain';
import { secureStorage } from '../../src/services/secureStorage';

// Jest mock is set up in jest.setup.js — reset before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('secureStorage', () => {
  describe('setToken', () => {
    it('stores token via Keychain setGenericPassword', async () => {
      await secureStorage.setToken('abc123');

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'brucelink_session',
        'abc123',
        expect.objectContaining({ service: 'brucelink_session' }),
      );
    });

    it('returns true on success', async () => {
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValueOnce(true);
      const result = await secureStorage.setToken('abc123');
      expect(result).toBe(true);
    });
  });

  describe('getToken', () => {
    it('returns token when credentials exist', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'brucelink_session',
        password: 'mytoken',
        service: 'brucelink_session',
        storage: 'keystore',
      });

      const token = await secureStorage.getToken();
      expect(token).toBe('mytoken');
    });

    it('returns null when no credentials exist', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(false);

      const token = await secureStorage.getToken();
      expect(token).toBeNull();
    });

    it('calls getGenericPassword with correct service', async () => {
      await secureStorage.getToken();

      expect(Keychain.getGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'brucelink_session' }),
      );
    });
  });

  describe('clearToken', () => {
    it('calls resetGenericPassword', async () => {
      await secureStorage.clearToken();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'brucelink_session' }),
      );
    });
  });
});

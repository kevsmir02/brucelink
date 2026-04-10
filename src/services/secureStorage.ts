// ---------------------------------------------------------------------------
// Secure Storage — OS-backed credential storage via react-native-keychain.
// Replaces AsyncStorage for session tokens (Stack Skill: Non-Negotiable).
//
// Source: https://oblador.github.io/react-native-keychain/docs/api
// Package: react-native-keychain v10.0.0
// Android: Keystore-backed EncryptedSharedPreferences
// iOS: Keychain Services
// ---------------------------------------------------------------------------

import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'brucelink_session';

export const secureStorage = {
  /**
   * Store the session token in OS-backed secure storage.
   */
  async setToken(token: string): Promise<boolean> {
    const result = await Keychain.setGenericPassword(SERVICE_NAME, token, {
      service: SERVICE_NAME,
    });
    return result !== false;
  },

  /**
   * Retrieve the session token from OS-backed secure storage.
   * Returns null if no token is stored.
   */
  async getToken(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });
    if (credentials === false) return null;
    return credentials.password;
  },

  /**
   * Clear the stored session token.
   */
  async clearToken(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: SERVICE_NAME,
    });
  },
};

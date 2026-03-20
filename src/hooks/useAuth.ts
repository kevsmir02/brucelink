import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreSession, logout as apiLogout, setBaseUrl } from '../services/api';
import { STORAGE_KEYS, DEFAULT_BASE_URL } from '../utils/constants';

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [baseUrl, setBaseUrlState] = useState<string>(DEFAULT_BASE_URL);

  useEffect(() => {
    (async () => {
      const { token, baseUrl: savedUrl } = await restoreSession();
      if (savedUrl) {
        setBaseUrlState(savedUrl);
        setBaseUrl(savedUrl);
      }
      setAuthState(token ? 'authenticated' : 'unauthenticated');
    })();
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    await AsyncStorage.removeItem(STORAGE_KEYS.session);
    setAuthState('unauthenticated');
  }, []);

  const markAuthenticated = useCallback((url: string) => {
    setBaseUrlState(url);
    setAuthState('authenticated');
  }, []);

  const markUnauthenticated = useCallback(() => {
    setAuthState('unauthenticated');
  }, []);

  return { authState, baseUrl, logout, markAuthenticated, markUnauthenticated };
}

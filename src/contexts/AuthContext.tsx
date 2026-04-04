import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid } from 'react-native';
import {
  restoreSession,
  logout as apiLogout,
  setBaseUrl,
  registerUnauthorizedHandler,
} from '../services/api';
import { STORAGE_KEYS, DEFAULT_BASE_URL } from '../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  authState: AuthState;
  baseUrl: string;
  logout: () => Promise<void>;
  markAuthenticated: (url: string) => void;
  markUnauthenticated: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [baseUrl, setBaseUrlState] = useState<string>(DEFAULT_BASE_URL);

  // Keep a stable ref to markUnauthenticated so the Axios interceptor
  // registered below always calls the latest version.
  const markUnauthenticatedRef = useRef<() => void>(() => {});

  // Restore persisted session on mount
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

  // Wire the Axios 401 interceptor once, using the stable ref
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      markUnauthenticatedRef.current();
      ToastAndroid.show('Session expired. Please log in again.', ToastAndroid.LONG);
    });
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

  // Keep ref in sync
  markUnauthenticatedRef.current = markUnauthenticated;

  return (
    <AuthContext.Provider
      value={{ authState, baseUrl, logout, markAuthenticated, markUnauthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

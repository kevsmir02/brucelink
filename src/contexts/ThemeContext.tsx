import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemeMode } from '../theme/tokens';
import {
  STORAGE_KEYS,
  applyThemeMode,
  resolveThemeMode,
  type ThemePreference,
} from '../utils/constants';

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ThemeMode;
  setThemePreference: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('dark');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.themeMode);
      if (isThemePreference(saved)) {
        setThemePreferenceState(saved);
      }
    })();
  }, []);

  const resolvedTheme = resolveThemeMode(themePreference, systemScheme);

  useEffect(() => {
    applyThemeMode(resolvedTheme);
  }, [resolvedTheme]);

  const setThemePreference = useCallback(async (next: ThemePreference) => {
    setThemePreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, next);
  }, []);

  const value = useMemo(
    () => ({ themePreference, resolvedTheme, setThemePreference }),
    [themePreference, resolvedTheme, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used inside <ThemeProvider>');
  }
  return ctx;
}

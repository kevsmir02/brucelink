import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useThemeMode } from './src/contexts/ThemeContext';
import { QueryProvider } from './src/providers/QueryProvider';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { useNetworkListener } from './src/hooks/useNetworkListener';

function AppContent() {
  const { resolvedTheme } = useThemeMode();
  useNetworkListener();

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <OfflineBanner />
      <AuthProvider>
        <QueryProvider>
          <AppNavigator />
        </QueryProvider>
      </AuthProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

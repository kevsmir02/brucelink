import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { QueryProvider } from './src/providers/QueryProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <AuthProvider>
        <QueryProvider>
          <AppNavigator />
        </QueryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

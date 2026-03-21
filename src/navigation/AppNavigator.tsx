import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, ToastAndroid } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import { setNavigateToLogin } from '../services/api';
import { COLORS } from '../utils/constants';

import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FileExplorerScreen } from '../screens/FileExplorerScreen';
import { FileEditorScreen } from '../screens/FileEditorScreen';
import { TerminalScreen } from '../screens/TerminalScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NavigatorScreen } from '../screens/NavigatorScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#1a1a1a' },
  headerTintColor: COLORS.primary,
  headerTitleStyle: { color: COLORS.text, fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.background },
  animation: 'slide_from_right' as const,
};

export function AppNavigator() {
  const { authState, markAuthenticated, markUnauthenticated } = useAuth();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    setNavigateToLogin(() => {
      if (navRef.current) {
        ToastAndroid.show('Session expired. Please log in again.', ToastAndroid.LONG);
        navRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
        markUnauthenticated();
      }
    });
  }, [markUnauthenticated]);

  if (authState === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator
        initialRouteName={authState === 'authenticated' ? 'Dashboard' : 'Login'}
        screenOptions={screenOptions}>
        <Stack.Screen
          name="Login"
          options={{ headerShown: false }}>
          {(props) => (
            <LoginScreen
              {...props}
              onLoginSuccess={markAuthenticated}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'BruceLink', headerBackVisible: false }}
        />
        <Stack.Screen
          name="FileExplorer"
          component={FileExplorerScreen}
          options={{ title: 'File Explorer' }}
        />
        <Stack.Screen
          name="FileEditor"
          component={FileEditorScreen}
          options={{ title: 'Editor' }}
        />
        <Stack.Screen
          name="Terminal"
          component={TerminalScreen}
          options={{ title: 'Terminal' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="Navigator"
          component={NavigatorScreen}
          options={{ title: 'Navigator' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

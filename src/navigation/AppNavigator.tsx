import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../utils/constants';
import { BrandedHeaderTitle } from '../components/BrandedHeaderTitle';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FileExplorerScreen } from '../screens/FileExplorerScreen';
import { FileEditorScreen } from '../screens/FileEditorScreen';
import { TerminalScreen } from '../screens/TerminalScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NavigatorScreen } from '../screens/NavigatorScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function DashboardHeaderTitle() {
  return <BrandedHeaderTitle />;
}

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.primary,
  headerTitleStyle: { color: COLORS.text, fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.background },
  animation: 'slide_from_right' as const,
};

function DashboardScreenWithBoundary(props: React.ComponentProps<typeof DashboardScreen>) {
  return (
    <ErrorBoundary>
      <DashboardScreen {...props} />
    </ErrorBoundary>
  );
}

function FileExplorerScreenWithBoundary(props: React.ComponentProps<typeof FileExplorerScreen>) {
  return (
    <ErrorBoundary>
      <FileExplorerScreen {...props} />
    </ErrorBoundary>
  );
}

function FileEditorScreenWithBoundary(props: React.ComponentProps<typeof FileEditorScreen>) {
  return (
    <ErrorBoundary>
      <FileEditorScreen {...props} />
    </ErrorBoundary>
  );
}

function TerminalScreenWithBoundary(props: React.ComponentProps<typeof TerminalScreen>) {
  return (
    <ErrorBoundary>
      <TerminalScreen {...props} />
    </ErrorBoundary>
  );
}

function SettingsScreenWithBoundary(props: React.ComponentProps<typeof SettingsScreen>) {
  return (
    <ErrorBoundary>
      <SettingsScreen {...props} />
    </ErrorBoundary>
  );
}

function NavigatorScreenWithBoundary(props: React.ComponentProps<typeof NavigatorScreen>) {
  return (
    <ErrorBoundary>
      <NavigatorScreen {...props} />
    </ErrorBoundary>
  );
}

export function AppNavigator() {
  const { authState, markAuthenticated } = useAuth();

  if (authState === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={authState === 'authenticated' ? 'Dashboard' : 'Login'}
        screenOptions={screenOptions}>
        <Stack.Screen
          name="Login"
          options={{ headerShown: false }}>
          {(props) => (
            <ErrorBoundary>
              <LoginScreen
                {...props}
                onLoginSuccess={markAuthenticated}
              />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreenWithBoundary}
          options={{
            headerTitle: DashboardHeaderTitle,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="FileExplorer"
          component={FileExplorerScreenWithBoundary}
          options={{ title: 'File Explorer' }}
        />
        <Stack.Screen
          name="FileEditor"
          component={FileEditorScreenWithBoundary}
          options={{ title: 'Editor' }}
        />
        <Stack.Screen
          name="Terminal"
          component={TerminalScreenWithBoundary}
          options={{ title: 'Terminal' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreenWithBoundary}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="Navigator"
          component={NavigatorScreenWithBoundary}
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

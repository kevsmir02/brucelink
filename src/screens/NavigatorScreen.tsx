import React, { Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TurboModuleRegistry,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigator'>;

/**
 * Only load react-native-webview JS after we know the native module exists.
 * Otherwise `TurboModuleRegistry.getEnforcing('RNCWebViewModule')` inside the
 * library throws and crashes the app (e.g. stale install after `npm install`).
 */
function isRNCWebViewLinked(): boolean {
  try {
    return TurboModuleRegistry.get('RNCWebViewModule') != null;
  } catch {
    return false;
  }
}

const WEBVIEW_LINKED = isRNCWebViewLinked();

const NavigatorWebCanvasLazy = lazy(() => import('./NavigatorWebCanvas'));

export function NavigatorScreen(props: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);

  if (!WEBVIEW_LINKED) {
    return (
      <View style={s.fallbackRoot}>
        <Text style={s.fallbackTitle}>WebView native module missing</Text>
        <Text style={s.fallbackBody}>
          <Text style={s.fallbackBold}>react-native-webview</Text> is in package.json but your
          Android build does not include it yet. Rebuild the native app so autolinking can compile
          RNCWebView:
        </Text>
        <View style={s.codeBlock}>
          <Text style={s.code}>cd android && ./gradlew clean</Text>
          <Text style={s.code}>cd .. && npx react-native run-android</Text>
        </View>
        <Text style={s.fallbackHint}>
          If you use Android Studio, use Build → Clean Project, then Run again. Do not rely on
          Metro-only reload after adding native dependencies.
        </Text>
      </View>
    );
  }

  return (
    <Suspense
      fallback={
        <View style={s.suspenseRoot}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={s.suspenseText}>Loading Navigator…</Text>
        </View>
      }>
      <NavigatorWebCanvasLazy {...props} />
    </Suspense>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    fallbackRoot: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
      justifyContent: 'center',
    },
    fallbackTitle: {
      color: theme.colors.error,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
    },
    fallbackBody: {
      color: theme.colors.text,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 16,
    },
    fallbackBold: {
      fontWeight: '700',
      color: theme.colors.primary,
    },
    codeBlock: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      marginBottom: 16,
      gap: 6,
    },
    code: {
      color: theme.colors.text,
      fontFamily: theme.typography.mono,
      fontSize: 12,
    },
    fallbackHint: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    suspenseRoot: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    suspenseText: {
      color: theme.colors.textMuted,
      fontSize: 14,
    },
  });
}

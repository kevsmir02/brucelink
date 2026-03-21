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
import { COLORS } from '../utils/constants';

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
  if (!WEBVIEW_LINKED) {
    return (
      <View style={styles.fallbackRoot}>
        <Text style={styles.fallbackTitle}>WebView native module missing</Text>
        <Text style={styles.fallbackBody}>
          <Text style={styles.fallbackBold}>react-native-webview</Text> is in package.json but your
          Android build does not include it yet. Rebuild the native app so autolinking can compile
          RNCWebView:
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>cd android && ./gradlew clean</Text>
          <Text style={styles.code}>cd .. && npx react-native run-android</Text>
        </View>
        <Text style={styles.fallbackHint}>
          If you use Android Studio, use Build → Clean Project, then Run again. Do not rely on
          Metro-only reload after adding native dependencies.
        </Text>
      </View>
    );
  }

  return (
    <Suspense
      fallback={
        <View style={styles.suspenseRoot}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.suspenseText}>Loading Navigator…</Text>
        </View>
      }>
      <NavigatorWebCanvasLazy {...props} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallbackRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: 'center',
  },
  fallbackTitle: {
    color: COLORS.error,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  fallbackBody: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  fallbackBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  codeBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  code: {
    color: COLORS.text,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  fallbackHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  suspenseRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  suspenseText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});

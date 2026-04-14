import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import { getScreen } from '../services/api';
import { navigatorWebSource } from '../assets/navigatorWebSource';
import { useTheme } from '../contexts/ThemeContext';

export interface DeviceScreenBufferRef {
  refresh: () => Promise<void>;
  setAutoReload: (ms: number) => void;
}

interface Props {
  onWifiWarning?: (warning: boolean) => void;
  style?: any;
  defaultAutoReloadMs?: number;
}

export const DeviceScreenBuffer = forwardRef<DeviceScreenBufferRef, Props>(
  ({ onWifiWarning, style, defaultAutoReloadMs = 0 }, ref) => {
    const theme = useTheme();
    const styles = makeStyles(theme);

    const webViewRef = useRef<WebView>(null);
    const loadingRef = useRef(false);
    const autoReloadTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const [screenHint, setScreenHint] = useState<'offline' | 'loading' | null>('loading');
    const [autoReloadMs, setAutoReloadMs] = useState(defaultAutoReloadMs);

    const fetchAndRender = useCallback(async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const b64 = await getScreen();
        if (b64 && webViewRef.current) {
          setScreenHint(null);
          webViewRef.current.postMessage(b64);
        } else {
          setScreenHint('offline');
        }
      } catch {
        setScreenHint('offline');
      } finally {
        loadingRef.current = false;
      }
    }, []);

    useEffect(() => {
      if (autoReloadTimer.current) {
        clearInterval(autoReloadTimer.current);
        autoReloadTimer.current = null;
      }
      if (autoReloadMs > 0) {
        autoReloadTimer.current = setInterval(fetchAndRender, autoReloadMs);
      }
      return () => {
        if (autoReloadTimer.current) {
          clearInterval(autoReloadTimer.current);
          autoReloadTimer.current = null;
        }
      };
    }, [autoReloadMs, fetchAndRender]);

    useEffect(() => {
      // initial fetch
      fetchAndRender();
    }, [fetchAndRender]);

    useImperativeHandle(ref, () => ({
      refresh: fetchAndRender,
      setAutoReload: setAutoReloadMs,
    }));

    const handleWebViewMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const msg = JSON.parse(event.nativeEvent.data);
          if (msg.type === 'wifiWarning' && onWifiWarning) {
            onWifiWarning(Boolean(msg.value));
          }
        } catch { /* ignore */ }
      },
      [onWifiWarning],
    );

    return (
      <View style={[styles.canvasWrapper, style]}>
        {screenHint === 'offline' && <Text style={styles.canvasMessage}>Device screen offline</Text>}
        {screenHint === 'loading' && <Text style={styles.canvasMessage}>Connecting...</Text>}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <WebView
            ref={webViewRef}
            source={navigatorWebSource}
            bounces={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            javaScriptEnabled
            onMessage={handleWebViewMessage}
            style={styles.webView}
          />
        </View>
      </View>
    );
  },
);

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    canvasWrapper: {
      backgroundColor: '#000000',
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      aspectRatio: 1, // device is 240x240, keep square in portrait
      borderWidth: 2,
      borderColor: theme.colors.border,
      width: '100%',
    },
    canvasMessage: {
      color: theme.colors.textMuted,
      fontSize: 14,
      zIndex: 10,
    },
    webView: {
      backgroundColor: 'transparent',
      flex: 1,
    },
  });

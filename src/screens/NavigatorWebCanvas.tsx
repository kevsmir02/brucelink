import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import Orientation from 'react-native-orientation-locker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { vibrate } from '../utils/vibrate';
import { setImmersiveNavigation } from '../utils/bruceSystemUi';
import type { RootStackParamList } from '../types';
import { sendCommand, getScreen } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { navigatorWebSource } from '../assets/navigatorWebSource';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigator'>;

const AUTO_RELOAD_OPTIONS: { label: string; value: number }[] = [
  { label: 'Off', value: 0 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
];

// 3×3 D-pad layout matching the WebUI navigator
const NAV_BUTTONS = [
  [
    { id: 'nextpage', label: 'PgUp',  icon: 'chevron-double-up',   cmd: 'nav nextpage' },
    { id: 'up',       label: 'Up',    icon: 'chevron-up',           cmd: 'nav up' },
    { id: 'menu',     label: 'Menu',  icon: 'radiobox-marked',      cmd: 'nav sel 500' },
  ],
  [
    { id: 'prev',     label: 'Prev',  icon: 'chevron-left',         cmd: 'nav prev' },
    { id: 'sel',      label: 'OK',    icon: 'circle-slice-8',       cmd: 'nav sel' },
    { id: 'next',     label: 'Next',  icon: 'chevron-right',        cmd: 'nav next' },
  ],
  [
    { id: 'prevpage', label: 'PgDn',  icon: 'chevron-double-down',  cmd: 'nav prevpage' },
    { id: 'down',     label: 'Down',  icon: 'chevron-down',         cmd: 'nav down' },
    { id: 'esc',      label: 'Back',  icon: 'arrow-u-left-top',     cmd: 'nav esc' },
  ],
];

// HTML is maintained in src/assets/navigator.html and resolved via asset bundling.

// ---------------------------------------------------------------------------
// NavButton
// ---------------------------------------------------------------------------
interface NavButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
  isCenter?: boolean;
}

function NavButton({ icon, label, onPress, disabled, isCenter }: NavButtonProps) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity
      style={[styles.navBtn, isCenter && styles.navBtnCenter, disabled && styles.navBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}>
      <Icon
        name={icon}
        size={isCenter ? 32 : 24}
        color={disabled ? theme.colors.border : isCenter ? theme.colors.primary : theme.colors.text}
      />
      <Text
        style={[
          styles.navBtnLabel,
          isCenter && styles.navBtnLabelCenter,
          disabled && styles.navBtnLabelDisabled,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// NavigatorScreen
// ---------------------------------------------------------------------------
export function NavigatorWebCanvas(_props: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const webViewRef        = useRef<WebView>(null);
  const loadingRef        = useRef(false);
  const navigatingRef     = useRef(false);
  const autoReloadTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading,       setLoading]       = useState(false);
  const [navigating,    setNavigating]    = useState(false);
  const [wifiWarning,   setWifiWarning]   = useState(false);
  const [autoReloadMs,  setAutoReloadMs]  = useState(0);
  const [screenHint,    setScreenHint]    = useState<'offline' | null>(null);

  // Fetch the TFT binary blob and push it into the WebView canvas
  const fetchAndRender = useCallback(async () => {
    if (loadingRef.current) { return; }
    loadingRef.current = true;
    setLoading(true);
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
    }
    finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Auto-reload only while this screen is focused (restarts correctly after navigate away/back)
  useEffect(() => {
    if (autoReloadTimer.current) {
      clearInterval(autoReloadTimer.current);
      autoReloadTimer.current = null;
    }
    if (isFocused && autoReloadMs > 0) {
      autoReloadTimer.current = setInterval(fetchAndRender, autoReloadMs);
    }
    return () => {
      if (autoReloadTimer.current) {
        clearInterval(autoReloadTimer.current);
        autoReloadTimer.current = null;
      }
    };
  }, [isFocused, autoReloadMs, fetchAndRender]);

  useFocusEffect(
    useCallback(() => {
      Orientation.lockToLandscape();
      setImmersiveNavigation(true);
      fetchAndRender();
      return () => {
        setImmersiveNavigation(false);
        Orientation.unlockAllOrientations();
      };
    }, [fetchAndRender]),
  );

  // Send a nav command, then refresh the screen after a short firmware delay
  const navigate = useCallback(async (cmd: string) => {
    if (navigatingRef.current) { return; }
    navigatingRef.current = true;
    setNavigating(true);
    vibrate(20);
    try {
      await sendCommand(cmd);
      /* Firmware needs time to redraw; a single early getscreen often returns partial UI (missing text). */
      await new Promise<void>(r => setTimeout(r, 480));
      await fetchAndRender();
      await new Promise<void>(r => setTimeout(r, 280));
      await fetchAndRender();
    } catch { /* ignore */ }
    finally {
      navigatingRef.current = false;
      setNavigating(false);
    }
  }, [fetchAndRender]);

  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'wifiWarning') {
        setWifiWarning(Boolean(msg.value));
      }
    } catch { /* malformed message — ignore */ }
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Text style={styles.topLabel}>Auto-reload:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reloadScroll}
          contentContainerStyle={styles.reloadScrollContent}>
          {AUTO_RELOAD_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, autoReloadMs === opt.value && styles.chipActive]}
              onPress={() => setAutoReloadMs(opt.value)}>
              <Text style={[styles.chipText, autoReloadMs === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.reloadBtn}
          onPress={fetchAndRender}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Icon name="refresh" size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {wifiWarning && (
        <View style={styles.wifiWarning}>
          <Icon name="alert" size={14} color={theme.colors.warning} />
          <Text style={styles.wifiWarningText}>
            WiFi features will disconnect you from the AP after configuration
          </Text>
        </View>
      )}

      <View
        style={[
          styles.bodyRow,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            paddingRight: Math.max(insets.right, 0),
          },
        ]}>
        <View style={styles.canvasColumn} collapsable={false}>
          <View style={styles.screenArea} collapsable={false}>
            <WebView
              ref={webViewRef}
              source={navigatorWebSource}
              style={styles.webView}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled
              domStorageEnabled
              onMessage={handleWebViewMessage}
              originWhitelist={['*']}
              androidLayerType="software"
            />
            {screenHint != null && (
              <View style={styles.screenHintOverlay} pointerEvents="none">
                <Icon name="wifi-off" size={28} color={theme.colors.textMuted} />
                <Text style={styles.screenHintTitle}>No screen data</Text>
                <Text style={styles.screenHintBody}>
                  Could not download /getscreen. Connect the phone/emulator to the Bruce Wi-Fi access
                  point, ensure the URL in Settings matches the device, then tap reload.
                </Text>
              </View>
            )}
            {navigating && (
              <View style={styles.navigatingOverlay}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.dpadRail}>
          <View style={styles.dpad}>
            {NAV_BUTTONS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.dpadRow}>
                {row.map(btn => (
                  <NavButton
                    key={btn.id}
                    icon={btn.icon}
                    label={btn.label}
                    onPress={() => navigate(btn.cmd)}
                    disabled={navigating}
                    isCenter={btn.id === 'sel'}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const DPAD_RAIL_WIDTH = 212;

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    bodyRow: {
      flex: 1,
      flexDirection: 'row',
      minHeight: 0,
    },
    canvasColumn: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
    },
    dpadRail: {
      width: DPAD_RAIL_WIDTH,
      minHeight: 0,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },

    /* Top bar */
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: 10,
    },
    topLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    reloadScroll: {
      flex: 1,
    },
    reloadScrollContent: {
      alignItems: 'center',
      gap: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    reloadBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    /* WiFi warning */
    wifiWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: 'rgba(245,158,11,0.12)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(245,158,11,0.3)',
    },
    wifiWarningText: {
      color: theme.colors.warning,
      fontSize: 11,
      flex: 1,
      flexWrap: 'wrap',
    },

    /* Canvas area — intentionally black (device display rendering) */
    screenArea: {
      flex: 1,
      backgroundColor: '#000',
      position: 'relative',
      minHeight: 0,
    },
    webView: {
      flex: 1,
      backgroundColor: '#000',
    },
    screenHintOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      gap: 10,
    },
    screenHintTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    screenHintBody: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    navigatingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: 10,
      pointerEvents: 'none',
    },

    /* D-pad (right rail, landscape-friendly) */
    dpad: {
      flex: 1,
      paddingVertical: 12,
      gap: 10,
      justifyContent: 'center',
    },
    dpadRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      alignItems: 'stretch',
    },
    navBtn: {
      flex: 1,
      minWidth: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 4,
      minHeight: 58,
    },
    navBtnCenter: {
      backgroundColor: 'rgba(168,85,247,0.12)',
      borderColor: theme.colors.primary,
      borderWidth: 1,
    },
    navBtnDisabled: {
      opacity: 0.35,
    },
    navBtnLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    navBtnLabelCenter: {
      color: theme.colors.primary,
    },
    navBtnLabelDisabled: {
      color: theme.colors.border,
    },
  });
}

export default NavigatorWebCanvas;

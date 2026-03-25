import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { vibrate } from '../utils/vibrate';
import type { RootStackParamList } from '../types';
import { sendCommand, getScreen, isDevBypassActive } from '../services/api';
import { COLORS } from '../utils/constants';

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

// ---------------------------------------------------------------------------
// WebView HTML — ports the full TFT canvas renderer from the firmware's
// embedded_resources/web_interface/index.js into a self-contained HTML page.
// RN → WebView: postMessage(base64String)
// WebView → RN: window.ReactNativeWebView.postMessage(JSON)
// ---------------------------------------------------------------------------
const NAVIGATOR_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}
canvas{display:block;max-width:100%;max-height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
#placeholder{position:absolute;color:#444;font-family:monospace;font-size:11px;text-align:center;padding:8px;pointer-events:none}
</style>
</head>
<body>
<canvas id="screen"></canvas>
<div id="placeholder">Tap the reload button\nto fetch the screen</div>
<script>
var canvas = document.getElementById('screen');
var ctx = canvas.getContext('2d');
var placeholder = document.getElementById('placeholder');

/* Parameter lists for each drawing function ID (mirrors keysMap in index.js) */
var KEYS_MAP = {
  0:  ['fg'],
  1:  ['x','y','w','h','fg'],
  2:  ['x','y','w','h','fg'],
  3:  ['x','y','w','h','r','fg'],
  4:  ['x','y','w','h','r','fg'],
  5:  ['x','y','r','fg'],
  6:  ['x','y','r','fg'],
  7:  ['x','y','x2','y2','x3','y3','fg'],
  8:  ['x','y','x2','y2','x3','y3','fg'],
  9:  ['x','y','rx','ry','fg'],
  10: ['x','y','rx','ry','fg'],
  11: ['x','y','x1','y1','fg'],
  12: ['x','y','r','ir','startAngle','endAngle','fg','bg'],
  13: ['x','y','bx','by','wd','fg','bg'],
  14: ['x','y','size','fg','bg','txt'],
  15: ['x','y','size','fg','bg','txt'],
  16: ['x','y','size','fg','bg','txt'],
  17: ['x','y','size','fg','bg','txt'],
  18: ['x','y','center','ms','fs','file'],
  20: ['x','y','h','fg'],
  21: ['x','y','w','fg'],
  99: ['w','h','rotation']
};

function color565toCSS(c) {
  var r = Math.round((((c >> 11) & 0x1f) * 255) / 31);
  var g = Math.round((((c >>  5) & 0x3f) * 255) / 63);
  var b = Math.round(((c & 0x1f) * 255) / 31);
  return 'rgb('+r+','+g+','+b+')';
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
  if (fill) ctx.fill(); else ctx.stroke();
}

function renderTFT(data) {
  placeholder.style.display = 'none';

  var startData = 0;
  var screenText = [];

  function getInt8()  { return data[startData++]; }
  function getInt16() {
    var v = (data[startData] << 8) | data[startData+1];
    startData += 2;
    return v;
  }
  function getString(len) {
    var bytes = data.slice(startData, startData + len);
    startData += len;
    return new TextDecoder().decode(bytes);
  }

  function parseEntry(fn, size) {
    var keys = KEYS_MAP[fn];
    if (!keys) return {};
    var r = {};
    var left = size - 3;  /* size includes: 1-byte size field + 1-byte fn + 1-byte header */
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === 'txt' || k === 'file') {
        r[k] = getString(left);
      } else if (k === 'rotation' || k === 'fs') {
        left -= 1;
        r[k] = getInt8();
        if (k === 'fs') r[k] = r[k] === 0 ? 'SD' : 'FS';
      } else {
        left -= 2;
        r[k] = getInt16();
      }
    }
    return r;
  }

  var offset = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  while (offset < data.length) {
    if (data[offset] !== 0xAA) { break; }
    startData = offset + 1;
    var size = getInt8();
    var fn   = getInt8();
    offset  += size;

    if (!KEYS_MAP[fn]) continue;
    var p = parseEntry(fn, size);

    ctx.lineWidth   = 1;
    ctx.fillStyle   = '#000';
    ctx.strokeStyle = '#000';

    if (fn === 99) {
      /* SCREEN_INFO — dimensions + rotation only (no fg in protocol; firmware falls through to FILLSCREEN next) */
      canvas.width  = p.w;
      canvas.height = p.h;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, p.w, p.h);
    } else if (fn === 0) {
      /* FILLSCREEN */
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (fn === 1) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (fn === 2) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(p.x, p.y, p.w, p.h);
    } else if (fn === 3) {
      ctx.strokeStyle = color565toCSS(p.fg);
      roundRect(p.x, p.y, p.w, p.h, p.r, false);
    } else if (fn === 4) {
      ctx.fillStyle = color565toCSS(p.fg);
      roundRect(p.x, p.y, p.w, p.h, p.r, true);
    } else if (fn === 5) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.stroke();
    } else if (fn === 6) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    } else if (fn === 7) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.moveTo(p.x,p.y); ctx.lineTo(p.x2,p.y2); ctx.lineTo(p.x3,p.y3);
      ctx.closePath(); ctx.stroke();
    } else if (fn === 8) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.moveTo(p.x,p.y); ctx.lineTo(p.x2,p.y2); ctx.lineTo(p.x3,p.y3);
      ctx.closePath(); ctx.fill();
    } else if (fn === 9) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI*2);
      ctx.stroke();
    } else if (fn === 10) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI*2);
      ctx.fill();
    } else if (fn === 11) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x1,p.y1); ctx.stroke();
    } else if (fn === 12) {
      /* DRAWARC */
      var arcW  = p.r - p.ir || 1;
      var arcR  = (p.r + p.ir) / 2;
      var arcSa = ((p.startAngle + 90) * Math.PI) / 180;
      var arcEa = ((p.endAngle   + 90) * Math.PI) / 180;
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.lineWidth   = arcW;
      ctx.beginPath(); ctx.arc(p.x, p.y, arcR, arcSa, arcEa); ctx.stroke();
    } else if (fn === 13) {
      /* DRAWWIDELINE */
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.lineWidth   = p.wd || 1;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.bx,p.by); ctx.stroke();
    } else if (fn >= 14 && fn <= 17) {
      /* DRAWCENTRESTRING / DRAWRIGHTSTRING / DRAWSTRING / PRINT */
      var bg  = (p.bg === p.fg) ? 0 : p.bg;
      var txt = (p.txt || '').replace(/\\n/g, '');
      screenText.push(txt);
      /* Approximate TFT character width for the monospace font */
      var fw   = p.size === 3 ? 13.5 : p.size === 2 ? 9 : 4.5;
      var xOff = fn === 15 ? txt.length * fw : fn === 14 ? (txt.length * fw) / 2 : 0;
      /* Background fill */
      ctx.fillStyle = color565toCSS(bg);
      ctx.fillRect(p.x - xOff, p.y, txt.length * fw, p.size * 8);
      /* Text */
      ctx.fillStyle    = color565toCSS(p.fg);
      ctx.font         = (p.size * 8) + 'px monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign    = fn === 14 ? 'center' : fn === 15 ? 'right' : 'left';
      ctx.fillText(txt, p.x, p.y);
    } else if (fn === 18) {
      /* DRAWIMAGE — skip: cannot send auth Cookie from within the WebView */
    } else if (fn === 20) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(p.x, p.y, 1, p.h);
    } else if (fn === 21) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(p.x, p.y, p.w, 1);
    }
  }

  /* Detect WiFi-related screens and notify RN */
  var allText = screenText.join(' ').toLowerCase();
  var isWifi  = allText.indexOf('wifi') !== -1
             || allText.indexOf('evil portal') !== -1
             || allText.indexOf('deauth') !== -1
             || allText.indexOf('handshake') !== -1;
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wifiWarning', value: isWifi }));
}

function base64ToUint8Array(b64) {
  var binary = atob(b64);
  var bytes   = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function handleMessage(ev) {
  try {
    renderTFT(base64ToUint8Array(ev.data));
  } catch(e) {
    console.error('renderTFT error:', e);
  }
}

/* React Native WebView fires 'message' on document (Android) or window (iOS) */
document.addEventListener('message', handleMessage);
window.addEventListener('message',   handleMessage);
</script>
</body>
</html>`;

/** Android: inline HTML often renders as a blank white WebView without a baseUrl (loadDataWithBaseURL). */
const NAVIGATOR_WEB_SOURCE = {
  html: NAVIGATOR_HTML,
  baseUrl: 'https://brucelink.invalid/',
};

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
  return (
    <TouchableOpacity
      style={[styles.navBtn, isCenter && styles.navBtnCenter, disabled && styles.navBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}>
      <Icon
        name={icon}
        size={isCenter ? 30 : 22}
        color={disabled ? COLORS.border : isCenter ? COLORS.primary : COLORS.text}
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
  const insets = useSafeAreaInsets();
  const webViewRef        = useRef<WebView>(null);
  const loadingRef        = useRef(false);
  const navigatingRef     = useRef(false);
  const autoReloadTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading,       setLoading]       = useState(false);
  const [navigating,    setNavigating]    = useState(false);
  const [wifiWarning,   setWifiWarning]   = useState(false);
  const [autoReloadMs,  setAutoReloadMs]  = useState(0);
  /** Why the canvas may be empty (dev bypass vs no device / network). */
  const [screenHint,    setScreenHint]    = useState<'dev' | 'offline' | null>(null);

  // Fetch the TFT binary blob and push it into the WebView canvas
  const fetchAndRender = useCallback(async () => {
    if (loadingRef.current) { return; }
    loadingRef.current = true;
    setLoading(true);
    try {
      const bypass = await isDevBypassActive();
      const b64 = await getScreen();
      if (b64 && webViewRef.current) {
        setScreenHint(null);
        webViewRef.current.postMessage(b64);
      } else if (bypass) {
        setScreenHint('dev');
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

  // Auto-reload interval management
  useEffect(() => {
    if (autoReloadTimer.current) {
      clearInterval(autoReloadTimer.current);
      autoReloadTimer.current = null;
    }
    if (autoReloadMs > 0) {
      autoReloadTimer.current = setInterval(fetchAndRender, autoReloadMs);
    }
    return () => {
      if (autoReloadTimer.current) { clearInterval(autoReloadTimer.current); }
    };
  }, [autoReloadMs, fetchAndRender]);

  // Initial fetch when the screen is focused; clear timer on blur
  useFocusEffect(
    useCallback(() => {
      fetchAndRender();
      return () => {
        if (autoReloadTimer.current) {
          clearInterval(autoReloadTimer.current);
          autoReloadTimer.current = null;
        }
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
      await new Promise<void>(r => setTimeout(r, 300));
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
      {/* ── Top bar: auto-reload chips + force-reload button ── */}
      <View style={styles.topBar}>
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
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Icon name="refresh" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── WiFi warning banner ── */}
      {wifiWarning && (
        <View style={styles.wifiWarning}>
          <Icon name="alert" size={14} color="#f59e0b" />
          <Text style={styles.wifiWarningText}>
            WiFi features will disconnect you from the AP after configuration
          </Text>
        </View>
      )}

      {/* ── Canvas area ── */}
      <View style={styles.screenArea} collapsable={false}>
        <WebView
          ref={webViewRef}
          source={NAVIGATOR_WEB_SOURCE}
          style={styles.webView}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleWebViewMessage}
          originWhitelist={['*']}
          {...(Platform.OS === 'android'
            ? { androidLayerType: 'hardware' as const }
            : {})}
        />
        {screenHint != null && (
          <View style={styles.screenHintOverlay} pointerEvents="none">
            <Icon
              name={screenHint === 'dev' ? 'test-tube' : 'wifi-off'}
              size={28}
              color={COLORS.textMuted}
            />
            <Text style={styles.screenHintTitle}>
              {screenHint === 'dev' ? 'Development mode' : 'No screen data'}
            </Text>
            <Text style={styles.screenHintBody}>
              {screenHint === 'dev'
                ? 'Skip login uses mock APIs only — there is no device to mirror. Log in while connected to the Bruce AP to use Navigator.'
                : 'Could not download /getscreen. Connect the phone/emulator to the Bruce Wi‑Fi access point, ensure the URL in Settings matches the device, then tap reload.'}
            </Text>
          </View>
        )}
        {navigating && (
          <View style={styles.navigatingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </View>

      {/* ── D-pad ── */}
      <View style={[styles.dpad, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  topLabel: {
    color: COLORS.textMuted,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: '#f59e0b',
    fontSize: 11,
    flex: 1,
    flexWrap: 'wrap',
  },

  /* Canvas area */
  screenArea: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
    opacity: 0.99,
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
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  screenHintBody: {
    color: COLORS.textMuted,
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

  /* D-pad */
  dpad: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 4,
  },
  dpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 4,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
    minHeight: 56,
  },
  navBtnCenter: {
    backgroundColor: 'rgba(155,81,224,0.14)',
    borderColor: COLORS.primary,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  navBtnLabelCenter: {
    color: COLORS.primary,
  },
  navBtnLabelDisabled: {
    color: COLORS.border,
  },
});

export default NavigatorWebCanvas;

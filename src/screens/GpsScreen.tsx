import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../types';
import { sendCommand } from '../services/api';
import { loader } from '../services/commands';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Gps'>;

export function GpsScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);

  const [busy, setBusy] = useState(false);
  const [activeOp, setActiveOp] = useState<string | null>(null);

  const exec = useCallback(async (label: string, cmd: string) => {
    setBusy(true);
    setActiveOp(label);
    try {
      const result = await sendCommand(cmd);
      ToastAndroid.show(result || 'Command sent', ToastAndroid.SHORT);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Command failed');
    } finally {
      setBusy(false);
      setActiveOp(null);
    }
  }, []);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>

      {busy && (
        <View style={s.busyRow}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
          <Text style={s.busyText}>{activeOp}…</Text>
        </View>
      )}

      {/* GPS Status */}
      <SectionHeader title="GPS STATUS" icon="satellite-variant" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          GPS module fix status and satellite count. Requires an active GPS module connection.
        </Text>
        <View style={s.statusGrid}>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Fix</Text>
            <Text style={s.statusValue}>—</Text>
          </View>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Satellites</Text>
            <Text style={s.statusValue}>—</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('GPS Status', loader.open('GPS'))}
          disabled={busy}>
          <Icon name="satellite-variant" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Refresh GPS Status</Text>
        </TouchableOpacity>
      </View>

      {/* Live Tracking */}
      <SectionHeader title="LIVE TRACKING" icon="crosshairs-gps" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Display live GPS coordinates: latitude, longitude, altitude, and speed.
        </Text>
        <View style={s.statusGrid}>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Latitude</Text>
            <Text style={s.statusValue}>—</Text>
          </View>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Longitude</Text>
            <Text style={s.statusValue}>—</Text>
          </View>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Altitude</Text>
            <Text style={s.statusValue}>—</Text>
          </View>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Speed</Text>
            <Text style={s.statusValue}>—</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Track', loader.open('GPS'))}
          disabled={busy}>
          <Icon name="crosshairs-gps" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Tracking</Text>
        </TouchableOpacity>
      </View>

      {/* Wardriving */}
      <SectionHeader title="WARDRIVING" icon="car-wireless" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          GPS-tagged WiFi network scanning. Combines WiFi scan results with GPS coordinates.
        </Text>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Wardriving', loader.open('GPS'))}
          disabled={busy}>
          <Icon name="car-wireless" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Wardriving</Text>
        </TouchableOpacity>
      </View>

      {/* Wigle Upload */}
      <SectionHeader title="WIGLE UPLOAD" icon="cloud-upload" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Upload wardriving results to the WiGLE database.
        </Text>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => exec('Wigle Upload', loader.open('GPS'))}
          disabled={busy}>
          <Icon name="cloud-upload" size={18} color={theme.colors.primary} />
          <Text style={s.secondaryBtnText}>Upload to WiGLE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title, icon, theme, s }: {
  title: string; icon: string;
  theme: ReturnType<typeof useTheme>; s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.sectionHeader}>
      <Icon name={icon} size={14} color={theme.colors.primary} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginTop: 20, marginBottom: theme.spacing.sm, marginLeft: 4,
    },
    sectionTitle: {
      color: theme.colors.textMuted, fontSize: 11,
      fontWeight: '700', letterSpacing: 1.5,
    },
    card: {
      backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
      borderWidth: 1, borderColor: theme.colors.border, padding: 14,
    },
    cardNote: {
      color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12,
    },
    statusGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12,
    },
    statusItem: {
      flex: 1, minWidth: '40%', backgroundColor: theme.colors.background,
      borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border,
      padding: 10, alignItems: 'center',
    },
    statusLabel: {
      color: theme.colors.textMuted, fontSize: 11, fontWeight: '600',
      letterSpacing: 0.5, marginBottom: 4,
    },
    statusValue: {
      color: theme.colors.text, fontSize: 16, fontWeight: '700',
      fontFamily: theme.typography.mono,
    },
    primaryBtn: {
      backgroundColor: theme.colors.primary, borderRadius: theme.radius.md,
      paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, marginTop: 4,
    },
    primaryBtnText: {
      color: theme.colors.background, fontWeight: '700', fontSize: 14,
    },
    secondaryBtn: {
      borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.md,
      paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, marginTop: 4,
    },
    secondaryBtnText: {
      color: theme.colors.primary, fontWeight: '700', fontSize: 14,
    },
    busyRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.colors.surface, padding: 10,
      borderRadius: theme.radius.sm, marginBottom: 8,
    },
    busyText: { color: theme.colors.textMuted, fontSize: 13 },
  });
}

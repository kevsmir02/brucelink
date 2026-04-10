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

type Props = NativeStackScreenProps<RootStackParamList, 'Nrf24'>;

export function Nrf24Screen(_props: Props) {
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

      {/* SPI Warning */}
      <View style={s.warningCard}>
        <Icon name="alert-circle" size={18} color={theme.colors.warning} />
        <Text style={s.warningText}>
          NRF24 and CC1101 (Sub-GHz) share the SPI bus. Only one radio can be active at a time.
          Ensure the Sub-GHz module is idle before using NRF24 features.
        </Text>
      </View>

      {/* Spectrum Analysis */}
      <SectionHeader title="SPECTRUM ANALYSIS" icon="chart-line" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Sweep the 2.4 GHz band and visualize channel activity using the NRF24 radio.
        </Text>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Spectrum', loader.open('NRF24'))}
          disabled={busy}>
          <Icon name="chart-bell-curve-cumulative" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Spectrum Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Jammer */}
      <SectionHeader title="JAMMER" icon="signal-off" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Flood 2.4 GHz channels with noise on all NRF24 channels. Use responsibly and only in
          environments you are authorized to test.
        </Text>
        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: theme.colors.error }]}
          onPress={() => {
            Alert.alert(
              'Confirm Jammer',
              'This will flood all NRF24 channels. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start Jammer', style: 'destructive', onPress: () => exec('Jammer', loader.open('NRF24')) },
              ],
            );
          }}
          disabled={busy}>
          <Icon name="signal-off" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Jammer</Text>
        </TouchableOpacity>
      </View>

      {/* Mousejack */}
      <SectionHeader title="MOUSEJACK" icon="mouse" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Exploit unencrypted wireless mice/keyboards (Logitech Unifying, Microsoft, Dell).
          Inject keystrokes into the target device.
        </Text>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Mousejack', loader.open('NRF24'))}
          disabled={busy}>
          <Icon name="mouse" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Mousejack</Text>
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
    warningCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
      borderWidth: 1, borderColor: theme.colors.warning, padding: 14,
    },
    warningText: {
      flex: 1, color: theme.colors.warning, fontSize: 13, lineHeight: 18,
    },
    primaryBtn: {
      backgroundColor: theme.colors.primary, borderRadius: theme.radius.md,
      paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, marginTop: 4,
    },
    primaryBtnText: {
      color: theme.colors.background, fontWeight: '700', fontSize: 14,
    },
    busyRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.colors.surface, padding: 10,
      borderRadius: theme.radius.sm, marginBottom: 8,
    },
    busyText: { color: theme.colors.textMuted, fontSize: 13 },
  });
}

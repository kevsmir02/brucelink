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

type Props = NativeStackScreenProps<RootStackParamList, 'Ble'>;

const SPAM_MODES = [
  { key: 'ios', label: 'iOS', icon: 'apple' },
  { key: 'android', label: 'Android', icon: 'android' },
  { key: 'samsung', label: 'Samsung', icon: 'cellphone' },
  { key: 'windows', label: 'Windows', icon: 'microsoft-windows' },
  { key: 'all', label: 'All', icon: 'broadcast' },
] as const;

export function BleScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);

  const [busy, setBusy] = useState(false);
  const [activeOp, setActiveOp] = useState<string | null>(null);
  const [selectedSpamMode, setSelectedSpamMode] = useState<string>('all');

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

      {/* Scan */}
      <SectionHeader title="BLE SCAN" icon="bluetooth-connect" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Scan for nearby BLE devices. Results appear on the device display.
        </Text>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Scan', loader.open('BLE'))}
          disabled={busy}>
          <Icon name="magnify" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start BLE Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Spam */}
      <SectionHeader title="BLE SPAM" icon="bluetooth-transfer" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Broadcast BLE Spam pairing notifications. Select target platform below.
        </Text>
        <View style={s.chipRow}>
          {SPAM_MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[s.chip, selectedSpamMode === m.key && s.chipActive]}
              onPress={() => setSelectedSpamMode(m.key)}>
              <Icon
                name={m.icon}
                size={14}
                color={selectedSpamMode === m.key ? theme.colors.background : theme.colors.text}
              />
              <Text style={[
                s.chipText,
                selectedSpamMode === m.key && s.chipTextActive,
              ]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Spam', loader.open('BLE'))}
          disabled={busy}>
          <Icon name="broadcast" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Spam ({selectedSpamMode})</Text>
        </TouchableOpacity>
      </View>

      {/* Bad BLE */}
      <SectionHeader title="BAD BLE" icon="bluetooth-off" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Execute Ducky scripts over BLE HID. Browse payload files on the SD card.
        </Text>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Bad BLE', loader.open('BLE'))}
          disabled={busy}>
          <Icon name="duck" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Launch Bad BLE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.secondaryBtn, { marginTop: 10 }]}
          onPress={() => {
            _props.navigation.navigate('FileExplorer', { fs: 'SD', folder: '/badble' });
          }}>
          <Icon name="folder" size={18} color={theme.colors.primary} />
          <Text style={s.secondaryBtnText}>Browse Ducky Scripts</Text>
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
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: theme.radius.sm, borderWidth: 1,
      borderColor: theme.colors.border, backgroundColor: theme.colors.background,
    },
    chipActive: {
      backgroundColor: theme.colors.primary, borderColor: theme.colors.primary,
    },
    chipText: { color: theme.colors.text, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: theme.colors.background },
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

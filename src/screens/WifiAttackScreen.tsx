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
import { wifi, loader } from '../services/commands';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'WifiAttack'>;

export function WifiAttackScreen(_props: Props) {
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

      {/* Legal Disclaimer */}
      <View style={s.disclaimerCard}>
        <Icon name="shield-alert" size={20} color={theme.colors.error} />
        <View style={s.disclaimerContent}>
          <Text style={s.disclaimerTitle}>Legal Disclaimer</Text>
          <Text style={s.disclaimerText}>
            These tools are for authorized security testing and educational purposes only.
            Unauthorized use against networks you do not own or have explicit written permission
            to test is illegal. Use at your own risk.
          </Text>
        </View>
      </View>

      {/* Recon */}
      <SectionHeader title="RECON" icon="radar" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Passive network reconnaissance. Discover devices, capture traffic, and map the network.
        </Text>
        <View style={s.btnGroup}>
          <TouchableOpacity
            style={s.groupBtn}
            onPress={() => exec('ARP Scan', wifi.arp())}
            disabled={busy}>
            <Icon name="lan" size={16} color={theme.colors.primary} />
            <Text style={s.groupBtnText}>ARP Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.groupBtn}
            onPress={() => exec('Sniffer', wifi.sniffer())}
            disabled={busy}>
            <Icon name="access-point-network" size={16} color={theme.colors.primary} />
            <Text style={s.groupBtnText}>Sniffer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.groupBtn}
            onPress={() => exec('Listen', wifi.listen())}
            disabled={busy}>
            <Icon name="ear-hearing" size={16} color={theme.colors.primary} />
            <Text style={s.groupBtnText}>Listen</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Attacks */}
      <SectionHeader title="ATTACKS" icon="flash-alert" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Active wireless attacks. Requires explicit authorization before use.
        </Text>
        <View style={s.btnGroup}>
          <TouchableOpacity
            style={s.groupBtn}
            onPress={() => {
              Alert.alert('Confirm', 'Start deauth attack?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start', style: 'destructive', onPress: () => exec('Deauth', wifi.deauth()) },
              ]);
            }}
            disabled={busy}>
            <Icon name="wifi-off" size={16} color={theme.colors.error} />
            <Text style={[s.groupBtnText, { color: theme.colors.error }]}>Deauth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.groupBtn}
            onPress={() => exec('Beacon Spam', wifi.beaconSpam())}
            disabled={busy}>
            <Icon name="broadcast" size={16} color={theme.colors.primary} />
            <Text style={s.groupBtnText}>Beacon Spam</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.btnGroup, { marginTop: 8 }]}>
          <TouchableOpacity
            style={s.groupBtn}
            onPress={() => exec('Evil Portal', loader.open('WiFi'))}
            disabled={busy}>
            <Icon name="web" size={16} color={theme.colors.primary} />
            <Text style={s.groupBtnText}>Evil Portal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.groupBtn}
            onPress={() => exec('Karma', loader.open('WiFi'))}
            disabled={busy}>
            <Icon name="ghost" size={16} color={theme.colors.primary} />
            <Text style={s.groupBtnText}>Karma</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Wardriving */}
      <SectionHeader title="WARDRIVING" icon="car-wireless" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          GPS-tagged WiFi network scanning. Requires GPS module to be active.
        </Text>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => exec('Wardriving', loader.open('WiFi'))}
          disabled={busy}>
          <Icon name="car-wireless" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Wardriving</Text>
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
    disclaimerCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
      borderWidth: 1, borderColor: theme.colors.error, padding: 14,
    },
    disclaimerContent: { flex: 1 },
    disclaimerTitle: {
      color: theme.colors.error, fontSize: 14, fontWeight: '700', marginBottom: 4,
    },
    disclaimerText: {
      color: theme.colors.textMuted, fontSize: 12, lineHeight: 18,
    },
    btnGroup: { flexDirection: 'row', gap: 8 },
    groupBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, borderRadius: theme.radius.sm,
      borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background,
    },
    groupBtnText: {
      color: theme.colors.text, fontSize: 13, fontWeight: '600',
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

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../types';
import { sendCommand } from '../services/api';
import { ir, loader } from '../services/commands';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Infrared'>;

const IR_PROTOCOLS = ['NEC', 'SIRC', 'RC5', 'RC6', 'Samsung32'] as const;

export function InfraredScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);

  const [busy, setBusy] = useState(false);
  const [activeOp, setActiveOp] = useState<string | null>(null);

  // Capture state
  const [captureRaw, setCaptureRaw] = useState(false);

  // Transmit state
  const [txProtocol, setTxProtocol] = useState<string>('NEC');
  const [txAddress, setTxAddress] = useState('');
  const [txCommand, setTxCommand] = useState('');

  // File player state
  const [filePath, setFilePath] = useState('');

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

  const handleCapture = () => {
    const cmd = ir.rx({ raw: captureRaw });
    exec('Capture', cmd);
  };

  const handleTransmit = () => {
    if (!txAddress.trim() || !txCommand.trim()) {
      Alert.alert('Error', 'Enter both address and command');
      return;
    }
    const cmd = ir.tx({
      protocol: txProtocol,
      address: txAddress.trim(),
      command: txCommand.trim(),
    });
    exec('Transmit', cmd);
  };

  const handlePlayFile = () => {
    if (!filePath.trim()) {
      Alert.alert('Error', 'Enter file path (e.g. /ir/tv_off.ir)');
      return;
    }
    const cmd = ir.txFromFile({ filepath: filePath.trim() });
    exec('File TX', cmd);
  };

  const handleTvBGone = () => {
    exec('TV-B-Gone', loader.open('TV-B-Gone'));
  };

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

      {/* Capture Section */}
      <SectionHeader title="CAPTURE" icon="arrow-collapse-down" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Listen for infrared signals. Uses ir.rx command.
        </Text>
        <View style={s.row}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleCapture} disabled={busy}>
            <Icon name="access-point" size={18} color={theme.colors.background} />
            <Text style={s.primaryBtnText}>Start Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.chipToggle, captureRaw && s.chipToggleActive]}
            onPress={() => setCaptureRaw(!captureRaw)}>
            <Text style={[s.chipToggleText, captureRaw && s.chipToggleTextActive]}>RAW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transmit Section */}
      <SectionHeader title="TRANSMIT" icon="remote" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Send an infrared signal with a specific protocol.
        </Text>
        <Text style={s.inputLabel}>Protocol</Text>
        <View style={s.protocolRow}>
          {IR_PROTOCOLS.map(p => (
            <TouchableOpacity
              key={p}
              style={[s.protocolChip, txProtocol === p && s.protocolChipActive]}
              onPress={() => setTxProtocol(p)}>
              <Text style={[s.protocolText, txProtocol === p && s.protocolTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.inputLabel}>Address</Text>
            <TextInput
              style={s.input}
              value={txAddress}
              onChangeText={setTxAddress}
              placeholder="e.g. 0x04"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.inputLabel}>Command</Text>
            <TextInput
              style={s.input}
              value={txCommand}
              onChangeText={setTxCommand}
              placeholder="e.g. 0x08"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={handleTransmit} disabled={busy}>
          <Icon name="broadcast" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Transmit</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <SectionHeader title="QUICK ACTIONS" icon="lightning-bolt" theme={theme} s={s} />
      <View style={s.card}>
        <TouchableOpacity style={s.actionRow} onPress={handleTvBGone} disabled={busy}>
          <Icon name="television-off" size={20} color={theme.colors.text} />
          <View style={s.actionText}>
            <Text style={s.actionLabel}>TV-B-Gone</Text>
            <Text style={s.actionSublabel}>Cycle through known TV power-off codes</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* File Player Section */}
      <SectionHeader title="FILE PLAYER" icon="file-music-outline" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Transmit IR signal from a .ir file on SD card. Uses ir.txFromFile command.
        </Text>
        <Text style={s.inputLabel}>File Path</Text>
        <TextInput
          style={s.input}
          value={filePath}
          onChangeText={setFilePath}
          placeholder="/ir/tv_off.ir"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
        />
        <TouchableOpacity style={s.primaryBtn} onPress={handlePlayFile} disabled={busy}>
          <Icon name="play" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Play File</Text>
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
    inputLabel: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 4 },
    input: {
      backgroundColor: theme.colors.background, borderWidth: 1,
      borderColor: theme.colors.border, borderRadius: theme.radius.sm,
      color: theme.colors.text, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, fontFamily: theme.typography.mono, marginBottom: 10,
    },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    primaryBtn: {
      backgroundColor: theme.colors.primary, borderRadius: theme.radius.md,
      paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, marginTop: 4, flex: 1,
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
    protocolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    protocolChip: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    protocolChipActive: {
      backgroundColor: theme.colors.primary, borderColor: theme.colors.primary,
    },
    protocolText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
    protocolTextActive: { color: theme.colors.background },
    chipToggle: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm,
      paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
    },
    chipToggleActive: {
      backgroundColor: theme.colors.primary, borderColor: theme.colors.primary,
    },
    chipToggleText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
    chipToggleTextActive: { color: theme.colors.background },
    actionRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14,
    },
    actionText: { flex: 1 },
    actionLabel: { color: theme.colors.text, fontSize: 15 },
    actionSublabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  });
}

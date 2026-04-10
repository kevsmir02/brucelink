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
import { rf } from '../services/commands';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SubGhz'>;

const FREQUENCY_PRESETS = [
  { label: '315 MHz', value: 315000000 },
  { label: '433.92 MHz', value: 433920000 },
  { label: '868 MHz', value: 868000000 },
  { label: '915 MHz', value: 915000000 },
];

export function SubGhzScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);

  const [busy, setBusy] = useState(false);
  const [activeOp, setActiveOp] = useState<string | null>(null);

  // Capture state
  const [captureRaw, setCaptureRaw] = useState(false);
  const [captureFreq, setCaptureFreq] = useState('');

  // Transmit state
  const [txKey, setTxKey] = useState('');
  const [txFreq, setTxFreq] = useState('433920000');
  const [txTe, setTxTe] = useState('0');
  const [txCount, setTxCount] = useState('10');

  // Scan state
  const [scanStart, setScanStart] = useState('433000000');
  const [scanEnd, setScanEnd] = useState('434000000');

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

  // -- Capture --
  const handleCapture = () => {
    const freq = captureFreq ? Number(captureFreq) : undefined;
    const cmd = rf.rx({ frequency: freq, raw: captureRaw });
    exec('Capture', cmd);
  };

  // -- Transmit --
  const handleTransmit = () => {
    if (!txKey.trim()) {
      Alert.alert('Error', 'Enter hex data to transmit');
      return;
    }
    const cmd = rf.tx({
      key: txKey.trim(),
      frequency: Number(txFreq),
      te: Number(txTe),
      count: Number(txCount),
    });
    exec('Transmit', cmd);
  };

  // -- Scan --
  const handleScan = () => {
    const cmd = rf.scan({
      startFrequency: Number(scanStart),
      stopFrequency: Number(scanEnd),
    });
    exec('Scan', cmd);
  };

  // -- File Player --
  const handlePlayFile = () => {
    if (!filePath.trim()) {
      Alert.alert('Error', 'Enter file path (e.g. /subghz/gate.sub)');
      return;
    }
    const cmd = rf.txFromFile({ filepath: filePath.trim() });
    exec('File TX', cmd);
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
      <SectionHeader title="CAPTURE" icon="antenna" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Listen for Sub-GHz signals using the CC1101 radio.
        </Text>
        <View style={s.row}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={captureFreq}
            onChangeText={setCaptureFreq}
            placeholder="Frequency (optional)"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[s.chipToggle, captureRaw && s.chipToggleActive]}
            onPress={() => setCaptureRaw(!captureRaw)}>
            <Text style={[s.chipToggleText, captureRaw && s.chipToggleTextActive]}>RAW</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={handleCapture} disabled={busy}>
          <Icon name="access-point" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Capture</Text>
        </TouchableOpacity>
      </View>

      {/* Frequency Presets */}
      <SectionHeader title="FREQUENCY PRESETS" icon="sine-wave" theme={theme} s={s} />
      <View style={s.presetRow}>
        {FREQUENCY_PRESETS.map(p => (
          <TouchableOpacity
            key={p.value}
            style={s.presetChip}
            onPress={() => {
              setCaptureFreq(String(p.value));
              setTxFreq(String(p.value));
            }}>
            <Text style={s.presetText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transmit Section */}
      <SectionHeader title="TRANSMIT" icon="broadcast" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Send a Sub-GHz signal with configurable parameters.
        </Text>
        <Text style={s.inputLabel}>Hex Data</Text>
        <TextInput
          style={s.input}
          value={txKey}
          onChangeText={setTxKey}
          placeholder="e.g. AABBCCDD"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
        />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.inputLabel}>Frequency</Text>
            <TextInput
              style={s.input}
              value={txFreq}
              onChangeText={setTxFreq}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.inputLabel}>TE</Text>
            <TextInput
              style={s.input}
              value={txTe}
              onChangeText={setTxTe}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.inputLabel}>Count</Text>
            <TextInput
              style={s.input}
              value={txCount}
              onChangeText={setTxCount}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={handleTransmit} disabled={busy}>
          <Icon name="broadcast" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Transmit</Text>
        </TouchableOpacity>
      </View>

      {/* Scan Section */}
      <SectionHeader title="FREQUENCY SCAN" icon="radar" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Sweep a frequency range to detect active signals.
        </Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.inputLabel}>Start Freq</Text>
            <TextInput
              style={s.input}
              value={scanStart}
              onChangeText={setScanStart}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.inputLabel}>End Freq</Text>
            <TextInput
              style={s.input}
              value={scanEnd}
              onChangeText={setScanEnd}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={handleScan} disabled={busy}>
          <Icon name="radar" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start Scan</Text>
        </TouchableOpacity>
      </View>

      {/* File Player Section */}
      <SectionHeader title="FILE PLAYER" icon="file-music-outline" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Transmit a Sub-GHz signal from a .sub file on SD card. Uses rf.txFromFile command.
        </Text>
        <Text style={s.inputLabel}>File Path</Text>
        <TextInput
          style={s.input}
          value={filePath}
          onChangeText={setFilePath}
          placeholder="/subghz/gate.sub"
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
    inputLabel: {
      color: theme.colors.textMuted, fontSize: 12, marginBottom: 4,
    },
    input: {
      backgroundColor: theme.colors.background, borderWidth: 1,
      borderColor: theme.colors.border, borderRadius: theme.radius.sm,
      color: theme.colors.text, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, fontFamily: theme.typography.mono, marginBottom: 10,
    },
    row: { flexDirection: 'row', alignItems: 'flex-end' },
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
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    presetChip: {
      backgroundColor: theme.colors.surface, borderWidth: 1,
      borderColor: theme.colors.border, borderRadius: theme.radius.sm,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    presetText: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
    chipToggle: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm,
      paddingHorizontal: 14, paddingVertical: 10, marginLeft: 8, marginBottom: 10,
    },
    chipToggleActive: {
      backgroundColor: theme.colors.primary, borderColor: theme.colors.primary,
    },
    chipToggleText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
    chipToggleTextActive: { color: theme.colors.background },
  });
}

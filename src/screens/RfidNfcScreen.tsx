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
import { loader } from '../services/commands';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'RfidNfc'>;

export function RfidNfcScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);

  const [busy, setBusy] = useState(false);
  const [activeOp, setActiveOp] = useState<string | null>(null);

  // NDEF state
  const [ndefUrl, setNdefUrl] = useState('');

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

  const handleReadTag = () => {
    exec('Read Tag', loader.open('RFID'));
  };

  const handleClone = () => {
    Alert.alert(
      'Clone Tag',
      'Place the source tag on the reader first, then follow the on-device prompts to write to a blank card.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Clone', onPress: () => exec('Clone', loader.open('RFID')) },
      ],
    );
  };

  const handleWriteNdef = () => {
    if (!ndefUrl.trim()) {
      Alert.alert('Error', 'Enter a URL or text payload for the NDEF record');
      return;
    }
    // NDEF write goes through the loader workflow on-device
    exec('NDEF Write', loader.open('RFID'));
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

      {/* Read Tag */}
      <SectionHeader title="READ TAG" icon="nfc" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Launch PN532 NFC reader. Place a tag within range of the device.
        </Text>
        <TouchableOpacity style={s.primaryBtn} onPress={handleReadTag} disabled={busy}>
          <Icon name="nfc-search-variant" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Start NFC Read</Text>
        </TouchableOpacity>
      </View>

      {/* Clone */}
      <SectionHeader title="CLONE" icon="content-copy" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Read a source tag, then write its data to a blank card. Follow on-device prompts.
        </Text>
        <TouchableOpacity style={s.primaryBtn} onPress={handleClone} disabled={busy}>
          <Icon name="content-copy" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Clone Tag</Text>
        </TouchableOpacity>
      </View>

      {/* NDEF Write */}
      <SectionHeader title="NDEF WRITE" icon="pencil-outline" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Write an NDEF URL or text record to a writeable NFC tag.
        </Text>
        <Text style={s.inputLabel}>URL or Text</Text>
        <TextInput
          style={s.input}
          value={ndefUrl}
          onChangeText={setNdefUrl}
          placeholder="https://example.com"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TouchableOpacity style={s.primaryBtn} onPress={handleWriteNdef} disabled={busy}>
          <Icon name="pencil" size={18} color={theme.colors.background} />
          <Text style={s.primaryBtnText}>Write NDEF</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Tags */}
      <SectionHeader title="SAVED TAGS" icon="folder-outline" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Browse saved NFC/Mifare/Amiibo files on the SD card (/nfc/, /mifare/, /amiibo/).
        </Text>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => {
          _props.navigation.navigate('FileExplorer', { fs: 'SD', folder: '/nfc' });
        }}>
          <Icon name="folder" size={18} color={theme.colors.primary} />
          <Text style={s.secondaryBtnText}>Browse NFC Files</Text>
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

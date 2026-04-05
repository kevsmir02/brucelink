import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/constants';
import { QuickAction } from '../components/QuickAction';
import { sendCommand } from '../services/api';
import { getSubGhzCommand } from '../utils/tacticalCommands';

type Props = NativeStackScreenProps<RootStackParamList, 'NrfInterceptor'>;

export function NrfInterceptorScreen({ navigation }: Props) {
  const triggerCommand = async (cmd: string, title: string, successMsg: string) => {
    try {
      await sendCommand(cmd);
      Alert.alert(title, successMsg);
    } catch (err: any) {
      Alert.alert('Command Failed', err.message);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>RF Interceptor (Sub-GHz)</Text>
      <Text style={styles.headerSubtitle}>Use firmware-supported Sub-GHz CLI commands for capture and frequency scan workflows.</Text>

      <Text style={styles.sectionTitle}>ANALYSIS</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="waveform"
          label="Capture Signal"
          onPress={() => triggerCommand(getSubGhzCommand('capture'), 'Capture Active', 'Listening for Sub-GHz signals. Trigger your remote now.')}
        />
        <QuickAction
          icon="target"
          label="Scan 433MHz"
          onPress={() => triggerCommand(getSubGhzCommand('scan433'), 'Spectrum Scan', 'Scanning 433MHz band range for activity.')}
        />
      </View>

      <Text style={styles.sectionTitleSpaced}>PAYLOADS</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="folder-open-outline"
          label="Saved .sub Files"
          onPress={() => navigation.navigate('FileExplorer', { fs: 'SD', folder: '/subghz' })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  headerTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 20 },
  sectionTitle: { color: COLORS.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  sectionTitleSpaced: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 24,
  },
  grid: { flexDirection: 'row', marginHorizontal: -4 },
});

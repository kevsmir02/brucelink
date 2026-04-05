import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/constants';
import { QuickAction } from '../components/QuickAction';
import { sendCommand } from '../services/api';
import { getReconCommand } from '../utils/tacticalCommands';

type Props = NativeStackScreenProps<RootStackParamList, 'ReconDashboard'>;

export function ReconDashboardScreen({ navigation }: Props) {
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
      <Text style={styles.headerTitle}>Recon Dashboard</Text>
      <Text style={styles.headerSubtitle}>Run WiFi recon tasks available through firmware CLI and review exported logs from storage.</Text>

      <Text style={styles.sectionTitle}>WIFI RECON</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="radar"
          label="ARP Host Scan"
          onPress={() => triggerCommand(getReconCommand('hostScan'), 'ARP Scan', 'Host scan started. Results stream to device output.')}
        />
        <QuickAction
          icon="wifi-alert"
          label="Packet Sniffer"
          onPress={() => triggerCommand(getReconCommand('sniffer'), 'Sniffer Active', 'Raw WiFi sniffer started from firmware CLI.')}
        />
      </View>

      <Text style={styles.sectionTitleSpaced}>NETWORK & EXPORT</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="lan-connect"
          label="TCP Listener"
          onPress={() => triggerCommand(getReconCommand('listener'), 'Listener Active', 'Listening on default TCP port from firmware.')}
        />
        <QuickAction
          icon="file-export-outline"
          label="Open SD Logs"
          onPress={() => navigation.navigate('FileExplorer', { fs: 'SD', folder: '/' })}
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

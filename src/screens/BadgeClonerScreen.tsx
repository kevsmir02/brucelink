import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/constants';
import { QuickAction } from '../components/QuickAction';
import { sendCommand } from '../services/api';
import { getBadgeClonerCommand } from '../utils/tacticalCommands';

type Props = NativeStackScreenProps<RootStackParamList, 'BadgeCloner'>;

export function BadgeClonerScreen({ navigation }: Props) {
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
      <Text style={styles.headerTitle}>Badge Cloner (PN532)</Text>
      <Text style={styles.headerSubtitle}>CLI support for PN532 is launcher-oriented. Open the RFID app, then operate from the device UI.</Text>

      <Text style={styles.sectionTitle}>DEVICE LAUNCH</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="credit-card-scan"
          label="Open RFID App"
          onPress={() => triggerCommand(getBadgeClonerCommand('openRfid'), 'RFID App', 'RFID app opened. Use the device controls to read/clone badges.')}
        />
        <QuickAction
          icon="view-list"
          label="List Apps"
          onPress={() => triggerCommand(getBadgeClonerCommand('listApps'), 'Application List', 'App list printed on the device output.')}
        />
      </View>

      <Text style={styles.sectionTitleSpaced}>DATA & TOOLS</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="folder-open-outline"
          label="RFID Files"
          onPress={() => navigation.navigate('FileExplorer', { fs: 'SD', folder: '/rfid' })}
        />
        <QuickAction
          icon="console"
          label="Terminal"
          onPress={() => navigation.navigate('Terminal')}
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

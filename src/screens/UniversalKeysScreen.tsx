import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/constants';
import { QuickAction } from '../components/QuickAction';
import { sendCommand } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'UniversalKeys'>;

export function UniversalKeysScreen({ navigation }: Props) {
  const handleListenSubGhz = async () => {
    try {
      await sendCommand('subghz rx');
      Alert.alert('Sub-GHz Listener Active', 'Device is now listening on the CC1101 module. Trigger your remote, then use the terminal or screen to save the payload.');
    } catch (err: any) {
      Alert.alert('Command Failed', err.message);
    }
  };

  const handleListenIR = async () => {
    try {
      await sendCommand('ir rx');
      Alert.alert('IR Listener Active', 'Device is now listening for Infrared signals on the IR receiver.');
    } catch (err: any) {
      Alert.alert('Command Failed', err.message);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Universal Keys Toolkit</Text>
      <Text style={styles.headerSubtitle}>Manage recorded payloads and capture new signals using CC1101 and Infrared.</Text>

      <Text style={styles.sectionTitle}>SUB-GHZ (CC1101)</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="radio-tower"
          label="Listen / Capture"
          onPress={handleListenSubGhz}
        />
        <QuickAction
          icon="folder-open-outline"
          label="Saved RF Files"
          onPress={() => navigation.navigate('FileExplorer', { fs: 'SD', folder: '/subghz' })}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>INFRARED (IR)</Text>
      <View style={styles.grid}>
        <QuickAction
          icon="remote"
          label="Listen / Capture"
          onPress={handleListenIR}
        />
        <QuickAction
          icon="folder-open-outline"
          label="Saved IR Files"
          onPress={() => navigation.navigate('FileExplorer', { fs: 'SD', folder: '/ir' })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
});

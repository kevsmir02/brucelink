import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, SystemInfo } from '../types';
import { getSystemInfo, rebootDevice } from '../services/api';
import { StorageBar } from '../components/StorageBar';
import { QuickAction } from '../components/QuickAction';
import { COLORS } from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    setError(null);
    try {
      const data = await getSystemInfo();
      setInfo(data);
    } catch {
      setError('Could not reach device. Are you connected to BruceNet?');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInfo();
    }, [fetchInfo]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInfo();
    setRefreshing(false);
  }, [fetchInfo]);

  const handleReboot = () => {
    Alert.alert(
      'Reboot Device',
      'Are you sure you want to reboot the Bruce device? Connection will drop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot',
          style: 'destructive',
          onPress: async () => {
            try {
              await rebootDevice();
              Alert.alert('Rebooting', 'The device is rebooting. Reconnect in a few seconds.');
            } catch {
              Alert.alert('Rebooting', 'Device is rebooting...');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }>

        {/* Header Banner */}
        <View style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>Bruce ESP32</Text>
              {info && (
              <Text style={styles.version}>v{info.BRUCE_VERSION}</Text>
            )}
          </View>
          <View style={styles.statusDot} />
        </View>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Storage section */}
        {info ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>STORAGE</Text>
            <StorageBar label="SD Card" info={info.SD} />
            <View style={styles.divider} />
            <StorageBar label="LittleFS" info={info.LittleFS} />
          </View>
        ) : !error ? (
          <View style={styles.card}>
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          </View>
        ) : null}

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.grid}>
          <QuickAction
            icon="folder-outline"
            label="File Explorer"
            onPress={() => navigation.navigate('FileExplorer', {})}
          />
          <QuickAction
            icon="console"
            label="Terminal"
            onPress={() => navigation.navigate('Terminal')}
          />
        </View>
        <View style={styles.grid}>
          <QuickAction
            icon="cog-outline"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
          <QuickAction
            icon="restart"
            label="Reboot"
            onPress={handleReboot}
            danger
          />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Pull down to refresh device info
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryDim,
  },
  bannerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  version: {
    color: COLORS.primary,
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Courier New',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.errorDim,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 0,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  loader: {
    marginVertical: 24,
  },
});

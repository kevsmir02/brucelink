import React from 'react';
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
import { RootStackParamList } from '../types';
import { rebootDevice } from '../services/api';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { StorageBar } from '../components/StorageBar';
import { QuickAction } from '../components/QuickAction';
import { COLORS, FONTS } from '../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { info, isLoading, isError, refetch, isRefetching } = useDeviceInfo();

  const isConnected = Boolean(info) && !isError;

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
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }>
        {/* Connection status banner */}
        <View style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>Device {isConnected ? 'Connected' : 'Disconnected'}</Text>
            <Text style={[styles.version, !isConnected && styles.versionDisconnected]}>
              {isConnected ? `Firmware v${info?.BRUCE_VERSION}` : 'Waiting for device response'}
            </Text>
          </View>
          <View style={[styles.statusDot, !isConnected && styles.statusDotDisconnected]} />
        </View>

        {/* Error banner */}
        {isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              Could not reach device. Are you connected to BruceNet?
            </Text>
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
        ) : isLoading ? (
          <View style={styles.card}>
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          </View>
        ) : null}

        {/* Tactical Operations */}
        <Text style={styles.sectionLabel}>TACTICAL OPERATIONS</Text>
        <View style={styles.grid}>
          <QuickAction
            icon="remote"
            label="Universal Keys"
            onPress={() => navigation.navigate('UniversalKeys')}
          />
          <QuickAction
            icon="id-card"
            label="Badge Cloner"
            onPress={() => navigation.navigate('BadgeCloner')}
          />
        </View>
        <View style={styles.grid}>
          <QuickAction
            icon="radar"
            label="WiFi Recon"
            onPress={() => navigation.navigate('ReconDashboard')}
          />
          <QuickAction
            icon="radio-tower"
            label="RF Tools"
            onPress={() => navigation.navigate('NrfInterceptor')}
          />
        </View>
        <View style={styles.grid}>
          <QuickAction
            icon="script-text-outline"
            label="Payloads"
            onPress={() => navigation.navigate('PayloadRunner')}
          />
        </View>

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
            icon="monitor-screenshot"
            label="Navigator"
            onPress={() => navigation.navigate('Navigator')}
          />
          <QuickAction
            icon="cog-outline"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
        <View style={styles.grid}>
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
    paddingTop: 8,
  },
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    marginTop: 8,
    fontFamily: FONTS.mono,
  },
  versionDisconnected: {
    color: COLORS.textMuted,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 3,
  },
  statusDotDisconnected: {
    backgroundColor: COLORS.error,
    shadowColor: COLORS.error,
    shadowOpacity: 0.4,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,68,68,0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 16,
  },
  grid: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  loader: {
    marginVertical: 24,
  },
});

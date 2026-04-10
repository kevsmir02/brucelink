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
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);
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
    <View style={s.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }>
        {/* Connection status banner */}
        <View style={s.banner}>
          <View>
            <Text style={s.bannerTitle}>Device {isConnected ? 'Connected' : 'Disconnected'}</Text>
            <Text style={[s.version, !isConnected && s.versionDisconnected]}>
              {isConnected ? `Firmware v${info?.BRUCE_VERSION}` : 'Waiting for device response'}
            </Text>
          </View>
          <View style={[s.statusDot, !isConnected && s.statusDotDisconnected]} />
        </View>

        {/* Error banner */}
        {isError && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>
              Could not reach device. Are you connected to BruceNet?
            </Text>
          </View>
        )}

        {/* Storage section */}
        {info ? (
          <View style={s.card}>
            <Text style={s.sectionLabel}>STORAGE</Text>
            <StorageBar label="SD Card" info={info.SD} />
            <View style={s.divider} />
            <StorageBar label="LittleFS" info={info.LittleFS} />
          </View>
        ) : isLoading ? (
          <View style={s.card}>
            <ActivityIndicator color={theme.colors.primary} style={s.loader} />
          </View>
        ) : null}

        {/* RF & Sub-GHz */}
        <Text style={s.sectionLabel}>RF &amp; SUB-GHZ</Text>
        <View style={s.grid}>
          <QuickAction
            icon="radio-tower"
            label="Sub-GHz"
            onPress={() => navigation.navigate('SubGhz')}
          />
          <QuickAction
            icon="remote"
            label="Infrared"
            onPress={() => navigation.navigate('Infrared')}
          />
        </View>

        {/* WiFi & Wireless */}
        <Text style={s.sectionLabel}>WIRELESS</Text>
        <View style={s.grid}>
          <QuickAction
            icon="wifi"
            label="WiFi Attack"
            onPress={() => navigation.navigate('WifiAttack')}
          />
          <QuickAction
            icon="bluetooth"
            label="BLE"
            onPress={() => navigation.navigate('Ble')}
          />
        </View>

        {/* Tools */}
        <Text style={s.sectionLabel}>TOOLS</Text>
        <View style={s.grid}>
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
        <View style={s.grid}>
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
        <View style={s.grid}>
          <QuickAction
            icon="script-text-outline"
            label="Payloads"
            onPress={() => navigation.navigate('PayloadRunner')}
          />
          <QuickAction
            icon="restart"
            label="Reboot"
            onPress={handleReboot}
            danger
          />
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          Pull down to refresh device info
        </Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    banner: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    bannerTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 1,
    },
    version: {
      color: theme.colors.primary,
      fontSize: 13,
      marginTop: theme.spacing.sm,
      fontFamily: theme.typography.mono,
    },
    versionDisconnected: {
      color: theme.colors.textMuted,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 3,
    },
    statusDotDisconnected: {
      backgroundColor: theme.colors.error,
      shadowColor: theme.colors.error,
      shadowOpacity: 0.4,
    },
    errorBanner: {
      backgroundColor: 'rgba(255,68,68,0.12)',
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 13,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.5,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.md,
    },
    grid: {
      flexDirection: 'row',
      marginHorizontal: -4,
      marginBottom: theme.spacing.sm,
    },
    footer: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    loader: {
      marginVertical: 24,
    },
  });
}

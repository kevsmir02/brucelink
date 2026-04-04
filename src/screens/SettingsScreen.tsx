import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootStackParamList } from '../types';
import { updateCredentials, rebootDevice, getSystemInfo } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../utils/constants';
import { ThemeModeSelector } from '../components/ThemeModeSelector';
import { useThemeMode } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App version sourced from package.json at bundle time
// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION: string = require('../../package.json').version;

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation: _navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { themePreference, resolvedTheme, setThemePreference } = useThemeMode();

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [credSaving, setCredSaving] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);

  // Fetch live firmware version from /systeminfo
  useEffect(() => {
    getSystemInfo()
      .then(info => setFirmwareVersion(info.BRUCE_VERSION))
      .catch(() => setFirmwareVersion(null));
  }, []);

  const handleSaveCreds = async () => {
    if (!newUsername || !newPassword) {
      Alert.alert('Error', 'Enter both username and password.');
      return;
    }
    setCredSaving(true);
    try {
      const result = await updateCredentials(newUsername, newPassword);
      ToastAndroid.show(result || 'Credentials updated', ToastAndroid.LONG);
      setNewUsername('');
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update credentials');
    } finally {
      setCredSaving(false);
    }
  };

  const handleReboot = () => {
    Alert.alert(
      'Reboot Device',
      'Reboot the Bruce device now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot',
          style: 'destructive',
          onPress: async () => {
            try {
              await rebootDevice();
            } catch {}
            Alert.alert('Rebooting', 'The device is rebooting. Reconnect in a few seconds.');
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Clear session and return to login screen?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        // Single source of truth: useAuth().logout() handles apiLogout() + storage + state
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>

      {/* WebUI Credentials */}
      <SectionHeader title="WEB UI CREDENTIALS" icon="key-outline" />
      <View style={styles.card}>
        <Text style={styles.cardNote}>
          Changes the Bruce device's web interface username and password.
        </Text>
        <Text style={styles.inputLabel}>New Username</Text>
        <TextInput
          style={styles.input}
          value={newUsername}
          onChangeText={setNewUsername}
          placeholder="username"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="password"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, credSaving && styles.btnDisabled]}
          onPress={handleSaveCreds}
          disabled={credSaving}>
          {credSaving ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.primaryBtnText}>Save Credentials</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Device */}
      <SectionHeader title="DEVICE" icon="chip" />
      <View style={styles.card}>
        <SettingsRow
          icon="restart"
          label="Reboot Device"
          onPress={handleReboot}
          danger
        />
      </View>

      {/* Appearance */}
      <SectionHeader title="APPEARANCE" icon="theme-light-dark" />
      <View style={styles.card}>
        <Text style={styles.cardNote}>Choose your theme preference.</Text>
        <ThemeModeSelector
          value={themePreference}
          onChange={(next) => {
            void setThemePreference(next);
          }}
        />
        <Text style={styles.modeHint}>Currently active: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}</Text>
      </View>

      {/* Session */}
      <SectionHeader title="SESSION" icon="account-outline" />
      <View style={styles.card}>
        <SettingsRow
          icon="logout"
          label="Logout"
          sublabel="Clear session and return to login"
          onPress={handleLogout}
          danger
        />
      </View>

      {/* About */}
      <SectionHeader title="ABOUT" icon="information-outline" />
      <View style={styles.card}>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>App Version</Text>
          <Text style={styles.aboutValue}>BruceLink v{APP_VERSION}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Firmware</Text>
          <Text style={styles.aboutValue}>
            {firmwareVersion != null ? `v${firmwareVersion}` : '—'}
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={14} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <Icon name={icon} size={20} color={danger ? COLORS.error : COLORS.text} />
      <View style={styles.settingsRowText}>
        <Text style={[styles.settingsLabel, danger && styles.dangerText]}>{label}</Text>
        {sublabel && <Text style={styles.settingsSublabel}>{sublabel}</Text>}
      </View>
      <Icon name="chevron-right" size={18} color={COLORS.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardNote: {
    color: COLORS.textMuted,
    fontSize: 13,
    padding: 14,
    paddingBottom: 8,
    lineHeight: 18,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 6,
    marginHorizontal: 14,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    marginHorizontal: 14,
    marginBottom: 14,
    fontFamily: 'Courier New',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowText: {
    flex: 1,
    marginLeft: 14,
  },
  settingsLabel: {
    color: COLORS.text,
    fontSize: 15,
  },
  settingsSublabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  modeHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginHorizontal: 14,
    marginBottom: 14,
  },
  dangerText: {
    color: COLORS.error,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aboutLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  aboutValue: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'Courier New',
  },
});

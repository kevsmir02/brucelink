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
import { ThemeModeSelector } from '../components/ThemeModeSelector';
import { useTheme, useThemeMode } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App version sourced from package.json at bundle time
// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION: string = require('../../package.json').version;

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation: _navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = makeStyles(theme);
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
      style={s.root}
      contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>

      {/* WebUI Credentials */}
      <SectionHeader title="WEB UI CREDENTIALS" icon="key-outline" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>
          Changes the Bruce device's web interface username and password.
        </Text>
        <Text style={s.inputLabel}>New Username</Text>
        <TextInput
          style={s.input}
          value={newUsername}
          onChangeText={setNewUsername}
          placeholder="username"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={s.inputLabel}>New Password</Text>
        <TextInput
          style={s.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="password"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[s.primaryBtn, credSaving && s.btnDisabled]}
          onPress={handleSaveCreds}
          disabled={credSaving}>
          {credSaving ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={s.primaryBtnText}>Save Credentials</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Device */}
      <SectionHeader title="DEVICE" icon="chip" theme={theme} s={s} />
      <View style={s.card}>
        <SettingsRow
          icon="restart"
          label="Reboot Device"
          onPress={handleReboot}
          danger
          theme={theme}
          s={s}
        />
      </View>

      {/* Appearance */}
      <SectionHeader title="APPEARANCE" icon="theme-light-dark" theme={theme} s={s} />
      <View style={s.card}>
        <Text style={s.cardNote}>Choose your theme preference.</Text>
        <ThemeModeSelector
          value={themePreference}
          onChange={(next) => {
            void setThemePreference(next);
          }}
        />
        <Text style={s.modeHint}>Currently active: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}</Text>
      </View>

      {/* Session */}
      <SectionHeader title="SESSION" icon="account-outline" theme={theme} s={s} />
      <View style={s.card}>
        <SettingsRow
          icon="logout"
          label="Logout"
          sublabel="Clear session and return to login"
          onPress={handleLogout}
          danger
          theme={theme}
          s={s}
        />
      </View>

      {/* About */}
      <SectionHeader title="ABOUT" icon="information-outline" theme={theme} s={s} />
      <View style={s.card}>
        <View style={s.aboutRow}>
          <Text style={s.aboutLabel}>App Version</Text>
          <Text style={s.aboutValue}>BruceLink v{APP_VERSION}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.aboutRow}>
          <Text style={s.aboutLabel}>Firmware</Text>
          <Text style={s.aboutValue}>
            {firmwareVersion != null ? `v${firmwareVersion}` : '—'}
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

function SectionHeader({ title, icon, theme, s }: { title: string; icon: string; theme: ReturnType<typeof useTheme>; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.sectionHeader}>
      <Icon name={icon} size={14} color={theme.colors.primary} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  theme,
  s,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  theme: ReturnType<typeof useTheme>;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity style={s.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <Icon name={icon} size={20} color={danger ? theme.colors.error : theme.colors.text} />
      <View style={s.settingsRowText}>
        <Text style={[s.settingsLabel, danger && s.dangerText]}>{label}</Text>
        {sublabel && <Text style={s.settingsSublabel}>{sublabel}</Text>}
      </View>
      <Icon name="chevron-right" size={18} color={theme.colors.border} />
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: 48,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 24,
      marginBottom: theme.spacing.sm,
      marginLeft: 4,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    cardNote: {
      color: theme.colors.textMuted,
      fontSize: 13,
      padding: 14,
      paddingBottom: 8,
      lineHeight: 18,
    },
    inputLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 6,
      marginHorizontal: 14,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      color: theme.colors.text,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      marginHorizontal: 14,
      marginBottom: 14,
      fontFamily: theme.typography.mono,
    },
    primaryBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingVertical: 12,
      alignItems: 'center',
      marginHorizontal: 14,
      marginBottom: 14,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    primaryBtnText: {
      color: theme.colors.background,
      fontWeight: '700',
      fontSize: 14,
      letterSpacing: 0.5,
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
    },
    settingsRowText: {
      flex: 1,
      marginLeft: 14,
    },
    settingsLabel: {
      color: theme.colors.text,
      fontSize: 15,
    },
    settingsSublabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    modeHint: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginHorizontal: 14,
      marginBottom: 14,
    },
    dangerText: {
      color: theme.colors.error,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginLeft: theme.spacing.md,
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 13,
    },
    aboutLabel: {
      color: theme.colors.textMuted,
      fontSize: 14,
    },
    aboutValue: {
      color: theme.colors.text,
      fontSize: 14,
      fontFamily: theme.typography.mono,
    },
  });
}

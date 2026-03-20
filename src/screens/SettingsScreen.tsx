import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  ToastAndroid,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootStackParamList } from '../types';
import { updateCredentials, rebootDevice, logout as apiLogout } from '../services/api';
import { COLORS } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [credSaving, setCredSaving] = useState(false);

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
        onPress: async () => {
          await apiLogout();
          await AsyncStorage.removeItem(STORAGE_KEYS.session);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

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
          <Text style={styles.aboutLabel}>App</Text>
          <Text style={styles.aboutValue}>BruceLink v1.0.0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Firmware</Text>
          <Text style={styles.aboutValue}>Bruce ESP32</Text>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.aboutRow}
          onPress={() => Linking.openURL('https://github.com/pr3y/Bruce')}>
          <Text style={styles.aboutLabel}>Bruce GitHub</Text>
          <View style={styles.linkRow}>
            <Text style={styles.link}>github.com/pr3y/Bruce</Text>
            <Icon name="open-in-new" size={14} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  link: {
    color: COLORS.primary,
    fontSize: 13,
  },
});

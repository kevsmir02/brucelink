import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { vibrate } from '../utils/vibrate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { login } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { STORAGE_KEYS, DEFAULT_BASE_URL } from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'> & {
  onLoginSuccess: (baseUrl: string) => void;
};

function isValidDeviceUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url) return false;
  const withScheme = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function LoginScreen({ navigation, onLoginSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [ip, setIp] = useState(DEFAULT_BASE_URL);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.baseUrl).then(saved => {
      if (saved) setIp(saved);
    });
  }, []);

  const handleConnect = async () => {
    setError(null);

    const normalizedIp = ip.trim();
    if (!isValidDeviceUrl(normalizedIp)) {
      setError('Enter a valid device URL (e.g. http://172.0.0.1)');
      return;
    }
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    vibrate(30);

    const url = normalizedIp.startsWith('http') ? normalizedIp : `http://${normalizedIp}`;

    try {
      const success = await login(url, username.trim(), password.trim());
      if (success) {
        onLoginSuccess(url);
        navigation.replace('Dashboard');
      } else {
        setError('Invalid username or password.');
        vibrate([0, 80, 50, 80]);
      }
    } catch (err: any) {
      const msg = err.message ?? 'Connection failed.';
      if (msg.includes('unreachable')) {
        setError('Device unreachable. Connect to the BruceNet WiFi AP first.');
      } else if (msg.includes('timeout') || msg.includes('ECONNABORTED')) {
        setError('Connection timed out. Is the device powered on?');
      } else {
        setError(`Error: ${msg}`);
      }
      vibrate([0, 80, 50, 80]);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(theme);

  return (
    <View style={s.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <KeyboardAvoidingView
        style={s.kav}
        behavior={undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
          keyboardShouldPersistTaps="handled">

          {/* Logo / Header */}
          <View style={s.logoSection}>
            <Image
              source={require('../assets/images/bruce-logo.png')}
              style={s.logoImage}
              resizeMode="contain"
              accessibilityLabel="Bruce firmware logo"
            />
            <Text style={s.appName}>BruceLink</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>Connect to Device</Text>

            <Text style={s.inputLabel}>Device URL</Text>
            <TextInput
              style={s.input}
              value={ip}
              onChangeText={setIp}
              placeholder="http://172.0.0.1"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel="Device URL"
            />

            <Text style={s.inputLabel}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Username"
            />

            <Text style={s.inputLabel}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Password"
            />

            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.button, loading && s.buttonDisabled]}
              onPress={handleConnect}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Connect to device">
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={s.buttonText}>CONNECT</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            Connect your Android device to the{'\n'}
            <Text style={s.hintAccent}>BruceNet</Text> WiFi access point first.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    kav: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xxxl,
      paddingBottom: theme.spacing.xxxl,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    logoImage: {
      width: '100%',
      maxWidth: 320,
      height: 112,
      marginBottom: theme.spacing.lg,
    },
    appName: {
      fontSize: 22,
      color: theme.colors.primary,
      fontFamily: theme.typography.pixel,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginBottom: 20,
      textTransform: 'uppercase',
    },
    inputLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      color: theme.colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: theme.spacing.lg,
      fontFamily: theme.typography.mono,
    },
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)',
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.error,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 13,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.colors.background,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 2,
      fontFamily: theme.typography.mono,
    },
    hint: {
      color: theme.colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 28,
      lineHeight: 20,
    },
    hintAccent: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });
}

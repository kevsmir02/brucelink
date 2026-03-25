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
import {
  COLORS,
  FONTS,
  STORAGE_KEYS,
  DEFAULT_BASE_URL,
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'> & {
  onLoginSuccess: (baseUrl: string) => void;
};

export function LoginScreen({ navigation, onLoginSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [ip, setIp] = useState(DEFAULT_BASE_URL);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.baseUrl).then(saved => {
      if (saved) setIp(saved);
    });
  }, []);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    vibrate(30);

    const normalizedIp = ip.trim();
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();
    const url = normalizedIp.startsWith('http') ? normalizedIp : `http://${normalizedIp}`;

    try {
      const success = await login(url, normalizedUsername, normalizedPassword);
      if (success) {
        onLoginSuccess(url);
        navigation.replace('Dashboard');
      } else {
        setError('Invalid username or password.');
        vibrate([0, 80, 50, 80]);
      }
    } catch (err: any) {
      const msg = err.message ?? 'Connection failed.';
      setError(msg.includes('unreachable')
        ? 'Device unreachable. Connect to the BruceNet WiFi AP first.'
        : `Error: ${msg}`);
      vibrate([0, 80, 50, 80]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
          keyboardShouldPersistTaps="handled">

          {/* Logo / Header */}
          <View style={styles.logoSection}>
            <Image
              source={require('../assets/images/bruce-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Bruce firmware logo"
            />
            <Text style={styles.appName}>BruceLink</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Connect to Device</Text>

            <Text style={styles.inputLabel}>Device URL</Text>
            <TextInput
              style={styles.input}
              value={ip}
              onChangeText={setIp}
              placeholder="http://172.0.0.1"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="admin"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>CONNECT</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Connect your Android device to the{'\n'}
            <Text style={styles.hintAccent}>BruceNet</Text> WiFi access point first.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: '100%',
    maxWidth: 320,
    height: 112,
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    color: COLORS.primary,
    fontFamily: FONTS.pixel,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    fontFamily: 'Courier New',
  },
  errorBox: {
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Courier New',
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 20,
  },
  hintAccent: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

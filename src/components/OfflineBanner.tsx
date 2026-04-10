import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../contexts/ThemeContext';
import { useConnectionStore } from '../stores/connectionStore';

/**
 * Persistent banner displayed when the device connection is lost.
 * Renders nothing when connected or idle.
 */
export function OfflineBanner() {
  const theme = useTheme();
  const status = useConnectionStore((s) => s.status);

  if (status === 'connected' || status === 'idle' || status === 'connecting') {
    return null;
  }

  const s = makeStyles(theme);

  return (
    <View style={s.banner}>
      <Icon name="wifi-off" size={16} color={theme.colors.warning} />
      <Text style={s.text}>Device disconnected — check WiFi connection</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.warning,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    text: {
      color: theme.colors.warning,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
  });
}

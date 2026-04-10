import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../contexts/ThemeContext';

type Status = 'loading' | 'error' | 'empty' | 'success';

interface StateContainerProps {
  status: Status;
  children: React.ReactNode;
  errorMessage?: string;
  emptyMessage?: string;
  onRetry?: () => void;
}

/**
 * Wraps screen content and renders the correct state:
 * - loading: centered spinner
 * - error: message + retry button
 * - empty: guidance message + optional CTA
 * - success: renders children
 */
export function StateContainer({
  status,
  children,
  errorMessage = 'Something went wrong',
  emptyMessage = 'Nothing here yet',
  onRetry,
}: StateContainerProps) {
  const theme = useTheme();
  const s = makeStyles(theme);

  if (status === 'loading') {
    return (
      <View style={s.center} testID="state-loading">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={s.center} testID="state-error">
        <Icon name="alert-circle-outline" size={40} color={theme.colors.error} />
        <Text style={s.errorText}>{errorMessage}</Text>
        {onRetry && (
          <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={s.center} testID="state-empty">
        <Icon name="inbox-outline" size={40} color={theme.colors.textMuted} />
        <Text style={s.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    retryBtn: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.xl,
    },
    retryText: {
      color: theme.colors.background,
      fontWeight: '700',
      fontSize: 14,
    },
  });
}

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import type { ThemePreference } from '../utils/constants';

interface ThemeModeSelectorProps {
  value: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeModeSelector({ value, onChange }: ThemeModeSelectorProps) {
  const theme = useTheme();
  const s = makeStyles(theme);

  return (
    <View style={s.root}>
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[s.option, selected && s.optionSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Theme ${option.label}`}>
            <Text style={[s.optionText, selected && s.optionTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginHorizontal: 14,
      marginBottom: 14,
      backgroundColor: theme.colors.background,
    },
    option: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    optionSelected: {
      backgroundColor: theme.colors.primary,
    },
    optionText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    optionTextSelected: {
      color: theme.colors.background,
    },
  });
}

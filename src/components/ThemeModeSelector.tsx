import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../utils/constants';
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
  return (
    <View style={styles.root}>
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Theme ${option.label}`}>
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: COLORS.background,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: COLORS.background,
  },
});

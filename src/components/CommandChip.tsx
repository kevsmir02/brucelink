import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { vibrate } from '../utils/vibrate';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  onPress: () => void;
}

export function CommandChip({ label, onPress }: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);

  const handlePress = () => {
    vibrate(20);
    onPress();
  };

  return (
    <TouchableOpacity style={s.chip} onPress={handlePress} activeOpacity={0.7}>
      <Text style={s.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    chip: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.primaryStrong,
    },
    label: {
      color: theme.colors.primary,
      fontSize: 12,
      fontFamily: 'Courier New',
      fontWeight: '600',
    },
  });
}

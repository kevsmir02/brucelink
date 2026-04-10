import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { vibrate } from '../utils/vibrate';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export function QuickAction({ icon, label, onPress, danger }: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);

  const handlePress = () => {
    vibrate(30);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[s.container, danger && s.danger]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Icon name={icon} size={28} color={danger ? theme.colors.error : theme.colors.primary} />
      <Text style={[s.label, danger && s.labelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 16,
      margin: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      minHeight: 88,
    },
    danger: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.surfaceAlt,
    },
    label: {
      color: theme.colors.text,
      fontSize: 12,
      marginTop: 8,
      fontWeight: '400',
      textAlign: 'center',
    },
    labelDanger: {
      color: theme.colors.error,
    },
  });
}

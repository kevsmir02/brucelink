import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { vibrate } from '../utils/vibrate';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export function QuickAction({ icon, label, onPress, danger }: Props) {
  const handlePress = () => {
    vibrate(30);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.container, danger && styles.danger]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Icon name={icon} size={28} color={danger ? COLORS.error : COLORS.primary} />
      <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    margin: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 88,
  },
  danger: {
    borderColor: 'rgba(255,68,68,0.25)',
    backgroundColor: 'rgba(255,68,68,0.06)',
  },
  label: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '400',
    textAlign: 'center',
  },
  labelDanger: {
    color: COLORS.error,
  },
});

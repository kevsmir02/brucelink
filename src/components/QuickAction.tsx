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

export const QuickAction: React.FC<Props> = ({ icon, label, onPress, danger }) => {
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 18,
    margin: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 90,
  },
  danger: {
    borderColor: COLORS.errorDim,
    backgroundColor: '#1a0a0a',
  },
  label: {
    color: COLORS.text,
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelDanger: {
    color: COLORS.error,
  },
});

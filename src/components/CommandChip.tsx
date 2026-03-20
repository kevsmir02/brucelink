import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { vibrate } from '../utils/vibrate';
import { COLORS } from '../utils/constants';

interface Props {
  label: string;
  onPress: () => void;
}

export const CommandChip: React.FC<Props> = ({ label, onPress }) => {
  const handlePress = () => {
    vibrate(20);
    onPress();
  };

  return (
    <TouchableOpacity style={styles.chip} onPress={handlePress} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryDim,
  },
  label: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Courier New',
    fontWeight: '600',
  },
});

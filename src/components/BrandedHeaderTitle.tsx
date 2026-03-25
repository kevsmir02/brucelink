import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../utils/constants';

export function BrandedHeaderTitle() {
  return (
    <View style={styles.row}>
      <Image
        source={require('../assets/images/bruce-logo.png')}
        style={styles.mark}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={styles.title}>BruceLink</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 40,
    height: 16,
  },
  title: {
    fontFamily: FONTS.pixel,
    fontSize: 15,
    color: COLORS.text,
  },
});

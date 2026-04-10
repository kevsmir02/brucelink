import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { FONTS } from '../utils/constants';

export function BrandedHeaderTitle() {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.row}>
      <Image
        source={require('../assets/images/bruce-logo.png')}
        style={s.mark}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={s.title}>BruceLink</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
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
      color: theme.colors.text,
    },
  });
}

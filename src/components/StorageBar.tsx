import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StorageInfo } from '../types';
import { FONTS } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  info: StorageInfo;
}

export function parseSize(s: string): number {
  const match = s.trim().match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case 'GB': return val * 1024 * 1024 * 1024;
    case 'MB': return val * 1024 * 1024;
    case 'KB': return val * 1024;
    default: return val;
  }
}

export function StorageBar({ label, info }: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const total = parseSize(info.total);
  const used = parseSize(info.used);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const barColor = pct > 85 ? theme.colors.error : pct > 65 ? theme.colors.warning : theme.colors.primary;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.stats}>
          {info.used} / {info.total}
        </Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={s.free}>{info.free} free</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    stats: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontFamily: FONTS.mono,
    },
    track: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
    },
    free: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 4,
      fontFamily: FONTS.mono,
    },
  });
}
